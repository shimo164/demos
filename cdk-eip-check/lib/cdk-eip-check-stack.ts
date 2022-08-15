import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as dotenv from 'dotenv';

dotenv.config();

export class CdkEipCheckStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const myTopic = sns.Topic.fromTopicArn(this, 'MyTopic', process.env.SNS_ARN ?? '');

    const fn = new lambda.Function(this, 'HelloHandler', {
      runtime: lambda.Runtime.PYTHON_3_9,
      code: lambda.Code.fromAsset('lambda'),
      handler: 'my_lambda.handler',
      environment: { 'StackName': CdkEipCheckStack.name, 'SNS_ARN': myTopic.topicArn, },
      retryAttempts: 0,
      timeout: cdk.Duration.seconds(60),
    });

    const snsTopicPolicy = new iam.PolicyStatement({
      actions: ['sns:publish'],
      resources: ['*'],
    });
    fn.addToRolePolicy(snsTopicPolicy);

    const ec2DescribePolicy = new iam.PolicyStatement({
      actions: ['ec2:Describe*'],
      resources: ['*'],
    });
    fn.addToRolePolicy(ec2DescribePolicy);

    const rule = new events.Rule(this, 'Schedule Rule', {
      enabled: true,
      schedule: events.Schedule.cron({ minute: '0', hour: '16' }),
    });
    rule.addTarget(new targets.LambdaFunction(fn));
  }
}
