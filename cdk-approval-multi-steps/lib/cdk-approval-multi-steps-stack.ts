import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subs from 'aws-cdk-lib/aws-sns-subscriptions';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { Construct } from 'constructs';

export class CdkApprovalMultiStepsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // --context email=your@mail
    const email = this.node.tryGetContext('email');

    const bucket = new s3.Bucket(this, 'bucket', {
      autoDeleteObjects: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ACLS,
      publicReadAccess: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      websiteIndexDocument: 'index.html',
    });

    const bucketName = bucket.bucketName;

    bucket.addToResourcePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        principals: [new iam.ServicePrincipal('lambda.amazonaws.com')],
        actions: ['s3:GetObject'],
        resources: [`${bucket.bucketArn}/*`],
      }),
    );

    const humanApprovalEmailTopic = new sns.Topic(this, 'humanApprovalEmailTopic');
    humanApprovalEmailTopic.addSubscription(new subs.EmailSubscription(email));

    const cloudWatchLogsPolicy = new iam.PolicyDocument({
      statements: [new iam.PolicyStatement({
        actions: [
          'logs:*',
        ],
        resources: ['*'],
      })],
    });

    const stepFunctionsPolicy = new iam.PolicyDocument({
      statements: [new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'states:SendTaskFailure',
          'states:SendTaskSuccess'
        ],
        resources: ['*'],
      })],
    });

    const s3DeleteObjectPolicy = new iam.PolicyDocument({
      statements: [new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          's3:DeleteObject'
        ],
        resources: ['*'],
      })],
    });

    const lambdaApprovalRole = new iam.Role(this, 'lambdaApprovalRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      inlinePolicies: {
        cloudWatchLogsPolicy: cloudWatchLogsPolicy,
        stepFunctionsPolicy: stepFunctionsPolicy,
        s3UploadPolicy: s3DeleteObjectPolicy
      },
    });

    const lambdaApprovalFunction = new lambda.Function(this, 'lambdaApprovalFunction', {
      runtime: lambda.Runtime.NODEJS_16_X,
      handler: 'approval.handler',
      code: lambda.Code.fromAsset('lambda'),
      retryAttempts: 0,
      environment: { 'EMAIL': email },
      timeout: cdk.Duration.seconds(60),
      role: lambdaApprovalRole,
    });

    const snsSendEmailPolicy = new iam.PolicyDocument({
      statements: [new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'SNS:Publish'
        ],
        resources: ['*'],
      })],
    });

    const s3UploadPolicy = new iam.PolicyDocument({
      statements: [new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          's3:PutObject'
        ],
        resources: ['*'],
      })],
    });

    const lambdaSendEmailExecutionRole = new iam.Role(this, 'lambdaSendEmailExecutionRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      inlinePolicies: {
        cloudWatchLogsPolicy: cloudWatchLogsPolicy,
        snsSendEmailPolicy: snsSendEmailPolicy,
        s3UploadPolicy: s3UploadPolicy
      },
    });

    const lambdaHumanApprovalSendEmailFunction = new lambda.Function(this, 'lambdaHumanApprovalSendEmailFunction', {
      runtime: lambda.Runtime.NODEJS_16_X,
      handler: 'send_email.handler',
      code: lambda.Code.fromAsset('lambda'),
      retryAttempts: 0,
      environment: {
        'SNS_ARN': humanApprovalEmailTopic.topicArn,
        'BUCKET_NAME': bucketName
      },
      timeout: cdk.Duration.seconds(60),
      role: lambdaSendEmailExecutionRole,
    });

    const invokeCallbackLambdaPolicy = new iam.PolicyDocument({
      statements: [new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'lambda:InvokeFunction'
        ],
        resources: [lambdaHumanApprovalSendEmailFunction.functionArn],
      })],
    });

    const lambdaStateMachineExecutionRole = new iam.Role(this, 'lambdaStateMachineExecutionRole', {
      assumedBy: new iam.ServicePrincipal('states.amazonaws.com'),
      inlinePolicies: {
        invokeCallbackLambdaPolicy: invokeCallbackLambdaPolicy,
      },
    });

    const fnUrl = lambdaApprovalFunction.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
    });

    const lambdaCallback = new tasks.LambdaInvoke(this, 'Lambda Callback', {
      lambdaFunction: lambdaHumanApprovalSendEmailFunction,
      integrationPattern: sfn.IntegrationPattern.WAIT_FOR_TASK_TOKEN,
      retryOnServiceExceptions: false,
      payload: sfn.TaskInput.fromObject({
        token: sfn.JsonPath.taskToken,
        'ExecutionContext.$': '$$',
        'LambdaURL': fnUrl.url
      }),
    });

    const approvedPassState = new sfn.Pass(this, 'approvedPassState');
    const rejectedPassState = new sfn.Pass(this, 'rejectedPassState');

    const definition = lambdaCallback
      .next(new sfn.Choice(this, 'manualApprovalChoiceState')
        .when(sfn.Condition.stringEquals('$.Status', `Approved! Task approved by ${email}`), approvedPassState)
        .otherwise(rejectedPassState)
      );

    new sfn.StateMachine(this, 'humanApprovalLambdaStateMachine', {
      role: lambdaStateMachineExecutionRole,
      definition,
      timeout: cdk.Duration.minutes(60),
    });
  }
};
