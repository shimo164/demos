import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';


export class CdkSelfDestructStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const { accountId, region } = new cdk.ScopedAws(this);

    const stackName = cdk.Stack.of(this).stackName;

    const fn_main = new lambda.Function(this, 'MainHandler', {
      runtime: lambda.Runtime.PYTHON_3_9,
      code: lambda.Code.fromAsset('lambda'),
      handler: 'index.handler',
      timeout: cdk.Duration.seconds(30),
    });

    const fn_destruct = new lambda.Function(this, 'DestructHandler', {
      runtime: lambda.Runtime.PYTHON_3_9,
      code: lambda.Code.fromAsset('lambda'),
      handler: 'destruct.handler',
      environment: { 'StackName': stackName },
      timeout: cdk.Duration.seconds(30),
    });

    const lambdaDeleteStackPolicy = new iam.PolicyStatement({
      actions: ['cloudformation:DeleteStack'],
      resources: [`arn:aws:cloudformation:${region}:${accountId}:stack/Cdk*/*`],
    });
    fn_destruct.addToRolePolicy(lambdaDeleteStackPolicy);


    const firstJob = new tasks.LambdaInvoke(this, 'First Job', {
      lambdaFunction: fn_main,
      outputPath: '$.Payload',
    });

    const secondJob = new tasks.LambdaInvoke(this, 'Second Job', {
      lambdaFunction: fn_destruct,
      outputPath: '$.Payload',
    });

    const definition = firstJob
      .next(secondJob);

    const stateMachine = new sfn.StateMachine(this, stackName + '-StateMachine', {
      definition,
      timeout: cdk.Duration.minutes(5),
    });

    new events.Rule(this, 'Schedule Rule', {
      schedule: events.Schedule.cron({ minute: '0', hour: '0' }),
      targets: [new targets.SfnStateMachine(stateMachine)]
    });
  }
}
