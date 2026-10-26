"""Build the app banks from preserved PDF imports and explicit content-review decisions."""
import json, re
from pathlib import Path
from collections import Counter
from review_decisions import *
ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/'src/data'
FILES={'clf':'aws-certified-cloud-practitioner-clf-c02_.pdf','saa':'AWS Certified Solutions Architect - Associate SAA-C03 Exam - Free Exam QAs Page 1 _ ExamTopic.pdf'}
# These are study references, not a claim that every item was individually documented.
SERVICES=[
 ('Amazon S3',r'\bS3\b','https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html','S3 provides object storage. Match access frequency, retention, retrieval latency, and request permissions to the scenario.'),
 ('Amazon EC2',r'\bEC2\b','https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/concepts.html','EC2 supplies virtual machines; instance placement, capacity, networking, and operating systems still require appropriate configuration.'),
 ('Amazon RDS',r'\bRDS\b','https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Welcome.html','RDS manages relational databases. Multi-AZ addresses availability; read replicas address read scaling.'),
 ('Amazon Aurora',r'\bAurora\b','https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/CHAP_AuroraOverview.html','Aurora separates database compute from distributed storage and supports replicas; select the correct reader or writer endpoint.'),
 ('Amazon DynamoDB',r'\bDynamoDB\b','https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Introduction.html','DynamoDB is a managed key-value/document database. Capacity, key design, and consistency settings determine how it handles the workload.'),
 ('AWS Lambda',r'\bLambda\b','https://docs.aws.amazon.com/lambda/latest/dg/welcome.html','Lambda runs event-driven code without server management. Retry handling and idempotency remain application responsibilities.'),
 ('Amazon SQS',r'\bSQS\b','https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/welcome.html','SQS buffers work between producers and consumers. FIFO ordering is per message group; handlers still need safe retry behavior.'),
 ('Amazon SNS',r'\bSNS\b','https://docs.aws.amazon.com/sns/latest/dg/welcome.html','SNS publishes notifications to multiple subscribers; subscription filters can limit which messages each subscriber receives.'),
 ('Amazon EventBridge',r'\bEventBridge\b','https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-what-is.html','EventBridge routes matching events to targets; rules and input transformers separate producers from consumers.'),
 ('AWS IAM',r'\bIAM\b|Identity and Access Management','https://docs.aws.amazon.com/IAM/latest/UserGuide/introduction.html','IAM controls access through identities, roles, and policies. Prefer least privilege and temporary role credentials.'),
 ('AWS KMS',r'\bKMS\b|Key Management Service','https://docs.aws.amazon.com/kms/latest/developerguide/overview.html','KMS controls cryptographic keys and their use through key policies and IAM permissions; encryption does not replace access control.'),
 ('Amazon VPC',r'\bVPC\b|NAT gateway|security group','https://docs.aws.amazon.com/vpc/latest/userguide/what-is-amazon-vpc.html','VPC routing, endpoints, and security groups determine network reachability. Private endpoints can avoid internet paths.'),
 ('Amazon CloudFront',r'\bCloudFront\b','https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Introduction.html','CloudFront caches content at edge locations. Cache policy, TTL, and invalidations control freshness.'),
 ('Amazon Route 53',r'Route 53','https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/Welcome.html','Route 53 supports DNS routing policies and health checks; choose the policy that matches latency, geography, or failover requirements.'),
 ('Amazon EFS',r'\bEFS\b|Elastic File System','https://docs.aws.amazon.com/efs/latest/ug/whatisefs.html','EFS provides shared NFS file storage for multiple compute clients; regional configurations support multi-AZ access.'),
 ('Amazon EBS',r'\bEBS\b|Elastic Block Store','https://docs.aws.amazon.com/ebs/latest/userguide/what-is-ebs.html','EBS provides block storage scoped to an Availability Zone. Snapshots support backup and restoration.'),
 ('Amazon FSx',r'\bFSx\b','https://docs.aws.amazon.com/fsx/','FSx offers managed file systems. Windows SMB, Lustre HPC, and ONTAP features address different workloads.'),
 ('Amazon ECS / AWS Fargate',r'\bECS\b|\bFargate\b','https://docs.aws.amazon.com/AmazonECS/latest/developerguide/Welcome.html','ECS orchestrates containers. Fargate removes host management, while EC2 launch types retain host control.'),
 ('Amazon EKS',r'\bEKS\b','https://docs.aws.amazon.com/eks/latest/userguide/what-is-eks.html','EKS provides a managed Kubernetes control plane; networking, pod permissions, and compute configuration remain important.'),
 ('Amazon ElastiCache',r'\bElastiCache\b|\bRedis\b','https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/WhatIs.html','ElastiCache supplies in-memory caching to reduce repeated database reads and latency; durability and failover requirements need separate consideration.'),
 ('Amazon Athena',r'\bAthena\b','https://docs.aws.amazon.com/athena/latest/ug/what-is.html','Athena queries data using SQL without managing query servers; S3 data layout affects performance and scan costs.'),
 ('AWS Glue',r'\bGlue\b|\bDataBrew\b','https://docs.aws.amazon.com/glue/latest/dg/what-is-glue.html','Glue provides managed data integration and cataloging; DataBrew provides visual data preparation.'),
 ('Amazon Redshift',r'\bRedshift\b','https://docs.aws.amazon.com/redshift/latest/mgmt/welcome.html','Redshift is a data warehouse for analytical SQL workloads rather than a general transactional database.'),
 ('AWS Secrets Manager',r'Secrets Manager','https://docs.aws.amazon.com/secretsmanager/latest/userguide/intro.html','Secrets Manager stores secrets and supports automated rotation with supported database and custom integrations.'),
 ('Amazon CloudWatch',r'\bCloudWatch\b','https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/WhatIsCloudWatch.html','CloudWatch collects metrics and logs and triggers alarms; choose signals that reflect the actual application bottleneck.'),
 ('AWS CloudTrail',r'\bCloudTrail\b','https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-user-guide.html','CloudTrail records account activity and API events to support auditing who performed an action and when.'),
 ('AWS Config',r'\bAWS Config\b','https://docs.aws.amazon.com/config/latest/developerguide/WhatIsConfig.html','Config records resource configuration and evaluates rules; remediation must be configured separately.'),
 ('AWS Organizations',r'\bOrganizations\b|\bSCP\b','https://docs.aws.amazon.com/organizations/latest/userguide/orgs_introduction.html','Organizations manages accounts centrally. SCPs bound member-account permissions but do not themselves grant access.'),
 ('AWS DataSync',r'\bDataSync\b','https://docs.aws.amazon.com/datasync/latest/userguide/what-is-datasync.html','DataSync automates transfers between supported storage locations and can perform incremental synchronization.'),
 ('AWS Storage Gateway',r'Storage Gateway|File Gateway|volume gateway','https://docs.aws.amazon.com/storagegateway/','Storage Gateway connects on-premises storage workflows to AWS through file, volume, or tape interfaces.'),
 ('AWS Snowball',r'\bSnowball\b','https://docs.aws.amazon.com/snowball/latest/developer-guide/whatissnowball.html','Snowball supports physical data transfer for eligible existing customers; availability and ordering restrictions must be checked.'),
 ('AWS DMS',r'\bDMS\b|Database Migration Service','https://docs.aws.amazon.com/dms/latest/userguide/Welcome.html','DMS migrates database data and supports change data capture; heterogeneous schema conversion is a separate concern.'),
 ('Amazon API Gateway',r'API Gateway','https://docs.aws.amazon.com/apigateway/latest/developerguide/welcome.html','API Gateway exposes managed APIs. Authorizers control access; API keys are for usage tracking and throttling, not authentication.'),
 ('AWS Backup',r'AWS Backup','https://docs.aws.amazon.com/aws-backup/latest/devguide/whatisbackup.html','AWS Backup centralizes backup policies, scheduling, retention, and supported cross-account or cross-Region copies.'),
 ('AWS Systems Manager',r'Systems Manager|Session Manager|Patch Manager','https://docs.aws.amazon.com/systems-manager/latest/userguide/what-is-systems-manager.html','Systems Manager manages supported nodes, sessions, inventory, and patch workflows with appropriate agent and IAM configuration.'),
 ('AWS Trusted Advisor',r'Trusted Advisor','https://docs.aws.amazon.com/awssupport/latest/user/trusted-advisor.html','Trusted Advisor provides recommendations across supported best-practice checks; check availability depends on the support plan.'),
 ('AWS Cost Management',r'Cost Explorer|AWS Budgets|Cost and Usage|Savings Plan|Reserved Instance','https://docs.aws.amazon.com/cost-management/','Cost Explorer analyzes spending; Budgets monitors thresholds. Commitments can reduce costs for predictable usage.'),
 ('AWS CloudFormation',r'CloudFormation','https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/Welcome.html','CloudFormation models and provisions AWS resources as infrastructure as code.'),
 ('Amazon Inspector',r'\bInspector\b','https://docs.aws.amazon.com/inspector/latest/user/what-is-inspector.html','Inspector continuously assesses supported workloads for vulnerabilities and unintended network exposure.'),
 ('Amazon GuardDuty',r'\bGuardDuty\b','https://docs.aws.amazon.com/guardduty/latest/ug/what-is-guardduty.html','GuardDuty detects suspicious activity; automated response requires a separate remediation integration.'),
 ('AWS WAF',r'\bWAF\b','https://docs.aws.amazon.com/waf/latest/developerguide/what-is-aws-waf.html','WAF applies application-layer web traffic rules, including IP matching and managed rule groups.'),
 ('Amazon Cognito',r'\bCognito\b','https://docs.aws.amazon.com/cognito/latest/developerguide/what-is-amazon-cognito.html','Cognito user pools authenticate application users and can support MFA and federation.'),
 ('AWS Direct Connect',r'Direct Connect','https://docs.aws.amazon.com/directconnect/latest/UserGuide/Welcome.html','Direct Connect provides dedicated connectivity; resiliency and encryption require additional design decisions.'),
 ('AWS Global Accelerator',r'Global Accelerator','https://docs.aws.amazon.com/global-accelerator/latest/dg/what-is-global-accelerator.html','Global Accelerator supplies static anycast IP addresses and routes traffic over the AWS network to healthy endpoints.'),
 ('AWS Step Functions',r'Step Functions','https://docs.aws.amazon.com/step-functions/latest/dg/welcome.html','Step Functions orchestrates workflows with explicit state, retries, and error handling.'),
 ('Amazon Kinesis / Data Firehose',r'Kinesis|Firehose','https://docs.aws.amazon.com/streams/latest/dev/introduction.html','Kinesis handles streaming records; Data Firehose delivers buffered streaming data to supported destinations.'),
 ('AWS Transfer Family',r'Transfer Family|Transfer for SFTP','https://docs.aws.amazon.com/transfer/latest/userguide/what-is-aws-transfer-family.html','Transfer Family provides managed file-transfer endpoints with protocol-specific authentication options.'),
]
DIRECT={
 ('clf',64):'https://aws.amazon.com/workspaces/applications/',
 ('clf',88):'https://aws.amazon.com/compliance/shared-responsibility-model/',
 ('clf',142):'https://docs.aws.amazon.com/whitepapers/latest/overview-aws-cloud-adoption-framework/governance-perspective.html',
 ('saa',88):'https://docs.aws.amazon.com/AmazonS3/latest/userguide/RequesterPaysBuckets.html',
 ('saa',133):'https://docs.aws.amazon.com/prescriptive-guidance/latest/replatform-oracle-database-options/high-availability.html',
 ('saa',809):'https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-target-connection-auth.html',
 ('saa',841):'https://docs.aws.amazon.com/ebs/latest/userguide/snapshot-archive.html',
}
DOMAINS={
 'clf':['Cloud Concepts','Security and Compliance','Cloud Technology and Services','Billing, Pricing, and Support'],
 'saa':['Design Secure Architectures','Design Resilient Architectures','Design High-Performing Architectures','Design Cost-Optimized Architectures']}
def classify(exam,text):
 t=text.lower()
 if exam=='clf':
  if re.search(r'cost|bill|pric|support plan|technical account|economies of scale',t): return DOMAINS[exam][3]
  if re.search(r'secur|compliance|encrypt|permission|responsib|iam|root user|audit',t): return DOMAINS[exam][1]
  if re.search(r'cloud adoption|well.architected|cloud benefit|agility|elasticity|cloud advantage|cloud value|migration strategy',t): return DOMAINS[exam][0]
  return DOMAINS[exam][2]
 if re.search(r'encrypt|secur|authenti|authoriz|permission|credential|complian|sensitive|protect|private.*access|access.*private',t): return DOMAINS[exam][0]
 if re.search(r'cost|cheapest|expens|spending|budget',t): return DOMAINS[exam][3]
 if re.search(r'resilien|availab|disaster|recovery|failover|fault|backup|durab|decoupl',t): return DOMAINS[exam][1]
 return DOMAINS[exam][2]
def clean(s):
 return s.replace('\ufffd', "'").replace('VPUpdate','VPC. Update')
report={}
for exam in ['clf','saa']:
 raw=json.loads((DATA/f'{exam}-imported.json').read_text(encoding='utf-8'))
 result=[]
 for source in raw:
  n=source['sourceQuestion']; prompt=clean(PROMPT_OVERRIDES[exam].get(n,source['prompt']))
  for old,new in TEXT_REPAIRS[exam].get(n,[]): prompt=prompt.replace(old,new)
  choices=[{'id':c['id'],'text':clean(CHOICE_OVERRIDES[exam].get(n,{}).get(c['id'],c['text']))} for c in source['choices']]
  candidate=source['sourceAnswers']
  if exam=='saa' and CANDIDATE_REVIEWED_RANGE[0]<=n<=CANDIDATE_REVIEWED_RANGE[1]: candidate=source['communityAnswers'] or candidate
  answer=list(KEY_CORRECTIONS[exam].get(n,candidate))
  reason=HOLD[exam].get(n,'')
  if source['importIssues']: reason=reason or '; '.join(source['importIssues'])
  labels=[c['id'] for c in choices]
  count=re.search(r'(?:choose|select)\s+(two|three|four|[234])',prompt,re.I)
  if count and len(answer)!={'two':2,'three':3,'four':4,'2':2,'3':3,'4':4}[count[1].lower()]: reason=reason or 'The number of answers does not match the selection instruction.'
  if not answer or not set(answer)<=set(labels) or len(set(labels))!=len(labels): reason=reason or 'The answer labels are incomplete or inconsistent.'
  if not any(a<=n<=b for a,b in REVIEWED_RANGES[exam]): reason=reason or 'Content review is pending.'
  correct_text=' '.join(c['text'] for c in choices if c['id'] in answer)
  # Apply conservative lifecycle exclusions to the selected solution, not distractors.
  legacy=re.search(r'\bQLDB\b|\bSnowmobile\b|\bSnowcone\b|Elastic Transcoder|Kinesis Data Analytics|\bPinpoint\b|Amazon Forecast|FSx File Gateway',correct_text,re.I)
  if legacy: reason=reason or f'The selected solution uses {legacy[0]}; its current service availability or replacement needs additional review.'
  tags=[s for s in SERVICES if re.search(s[1],correct_text,re.I)]
  if not tags: tags=[s for s in SERVICES if re.search(s[1],prompt,re.I)]
  tags=tags[:4]
  refs=[{'label':s[0],'url':s[2]} for s in tags]
  if (exam,n) in DIRECT: refs.insert(0,{'label':'Answer-specific AWS reference','url':DIRECT[(exam,n)]})
  if not refs: refs=[{'label':'AWS certification study guide','url': 'https://docs.aws.amazon.com/aws-certification/latest/'+('cloud-practitioner-02/cloud-practitioner-02.html' if exam=='clf' else 'solutions-architect-associate-03.html')}]
  changed_key=set(answer)!=set(source['sourceAnswers'])
  changed_text=prompt!=clean(source['prompt']) or choices!=[{'id':c['id'],'text':clean(c['text'])} for c in source['choices']]
  notes=NOTES[exam].get(n,'')
  if 'Snowball' in correct_text: notes+=' This legacy device scenario assumes an eligible existing Snowball customer; new customer availability is restricted.'
  if 'Object Lambda' in correct_text: notes+=' S3 Object Lambda availability is restricted to eligible existing customers; this source scenario assumes eligibility.'
  explanation=notes.strip() or (' '.join(s[3] for s in tags[:2]) if tags else 'Review the selected option against the requirements in the scenario; the linked guide provides the relevant study topics.')
  item={'id':source['id'],'prompt':prompt,'choices':choices,'answers':[] if reason else answer,'domain':classify(exam,prompt),'services':[s[0] for s in tags],
   'explanation':reason or explanation,
   'validation':{'status':'flagged' if reason else 'reviewed','reviewedOn':'2026-10-26','method':'AI content review with targeted AWS documentation checks; not independent expert certification.',
    'sourceFile':FILES[exam],'sourceQuestion':n,'sourcePage':source['sourcePage'],'sourceAnswers':source['sourceAnswers'],
    'correctedFromPdf':changed_key and not reason,'wordingCorrected':changed_text,'sourceUrl':refs[0]['url'],'references':refs,'note':notes.strip(),'holdReason':reason,'domainClassification':'Inferred study classification'},
   'original':{'prompt':source['prompt'],'choices':source['choices']} if changed_text or reason else None}
  result.append(item)
 (DATA/f'{exam}-reviewed.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
 ready=[q for q in result if q['validation']['status']=='reviewed']
 report[exam]={'imported':len(result),'reviewed':len(ready),'flagged':len(result)-len(ready),'correctedKeys':sum(q['validation']['correctedFromPdf'] for q in ready),'wordingRepairs':sum(q['validation']['wordingCorrected'] for q in ready),'domains':dict(Counter(q['domain'] for q in ready))}
 print(exam,report[exam])
report['method']='All imported prompts and candidate solutions received AI content review. AWS documentation was consulted for targeted issues, not individually for every question. Community votes and printed keys are not proof of correctness. Flagged questions remain available for inspection but are excluded from tests. Domain and service labels are inferred study aids.'
(DATA/'review-summary.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
lines=['# PDF import and answer review','',report['method'],'','Review date: 2026-10-26. Source pages are one-based PDF pages.','']
for exam in ['clf','saa']:
 lines+=['## '+exam.upper(),'',str(report[exam]),'','### Answer-key changes and wording repairs','']
 bank=json.loads((DATA/f'{exam}-reviewed.json').read_text(encoding='utf-8'))
 for q in bank:
  v=q['validation']
  if v['status']=='reviewed' and (v['correctedFromPdf'] or v['wordingCorrected']): lines.append(f"- Q{v['sourceQuestion']} (page {v['sourcePage']}): PDF {''.join(v['sourceAnswers']).upper()} → reviewed {''.join(q['answers']).upper()}. {'Wording repaired. ' if v['wordingCorrected'] else ''}{v['note']}")
 lines+=['','### Flagged, excluded from tests','']
 for q in bank:
  v=q['validation']
  if v['status']=='flagged': lines.append(f"- Q{v['sourceQuestion']} (page {v['sourcePage']}): {v['holdReason']}")
 lines.append('')
(ROOT/'QUESTION_REVIEW.md').write_text('\n'.join(lines),encoding='utf-8')
