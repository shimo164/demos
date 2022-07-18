import { Stack, StackProps, CfnParameter } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as dotenv from 'dotenv';

dotenv.config();
export class CdkLambdaSnsStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // 1. Set SNS Topic
    // 1-1 Use existing SNS topic: Hard code the topic arn
    // const myTopic = sns.Topic.fromTopicArn(this, 'MyTopic', <topic-arn>);

    // 1-2 Use existing SNS topic: Read arn from .env file
    // const myTopic = sns.Topic.fromTopicArn(this, 'MyTopic', process.env.SNS_ARN ?? '');

    // 1-3 Create a new SNS topic
    const myTopic = new sns.Topic(this, 'MyTopic');

    // 2.Set SNS subscription
    // 2-1 Hard code email address
    // myTopic.addSubscription(new subscriptions.EmailSubscription('mail-at-address'));

    // 2-2 Read email address from .env file
    // myTopic.addSubscription(new subscriptions.EmailSubscription(process.env.MY_EMAIL ?? ''));

    // 2-3 Read Context: cdk deploy --context email=aaaa@example.com
    // const email = this.node.tryGetContext('email');
    // myTopic.addSubscription(new subscriptions.EmailSubscription(email));

    // 2-4 Read from Cfn parameter for email address. cdk deploy --parameters emailparam=aaaa@example.com
    // const email = new CfnParameter(this, 'email-param');
    // myTopic.addSubscription(new subscriptions.EmailSubscription(email.valueAsString));

    const helloFn = new lambda.Function(this, 'HelloHandler', {
      runtime: lambda.Runtime.PYTHON_3_9,
      code: lambda.Code.fromAsset('lambda'),
      handler: 'my_lambda.handler',
      environment: {'SNS_ARN': myTopic.topicArn,},
    });

    const snsTopicPolicy = new iam.PolicyStatement({
      actions: ['sns:publish'],
      resources: ['*'],
    });

    helloFn.addToRolePolicy(snsTopicPolicy);
  }
}
