import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as actions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as iam from 'aws-cdk-lib/aws-iam';


export class CdkSingleCwAlarmStopLambdaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Set threshold for 1 minute
    const threshold_sum_all_lambda_invocations = 100;
    const threshold_lambda_stop_env = 50;

    const metric = new cloudwatch.Metric({
      namespace: 'AWS/Lambda',
      metricName: 'Invocations',
      statistic: 'Sum',
      period: cdk.Duration.minutes(1),
      dimensionsMap: {
      }
    });

    const alarm = new cloudwatch.Alarm(this, 'Alarm', {
      metric: metric,
      threshold: threshold_sum_all_lambda_invocations,
      evaluationPeriods: 1,
      datapointsToAlarm: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
    });

    const trigger_topic = new sns.Topic(this, "TriggerLambdaTopic");
    alarm.addAlarmAction(new actions.SnsAction(trigger_topic));

    const myTopic = new sns.Topic(this, 'MyTopic');
    const email = this.node.tryGetContext('email');
    myTopic.addSubscription(new subscriptions.EmailSubscription(email));

    const stopLoopFn = new lambda.Function(this, 'stopHandler', {
      runtime: lambda.Runtime.PYTHON_3_9,
      code: lambda.Code.fromAsset('lambda'),
      handler: 'index.handler',
      environment: {
        'SNS_ARN': myTopic.topicArn,
        'THRESHOLD_LAMBDA_STOP': threshold_lambda_stop_env.toString()
      },
    });

    trigger_topic.addSubscription(new subscriptions.LambdaSubscription(stopLoopFn));

    const lambdaRolePolicy = new iam.PolicyStatement({
      actions: [
        'sns:publish',
        'lambda:PutFunctionConcurrency',
        'cloudwatch:GetMetricData'],
      resources: ['*'],
    });
    stopLoopFn.addToRolePolicy(lambdaRolePolicy);
  }
}
