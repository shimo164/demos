import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subs from 'aws-cdk-lib/aws-sns-subscriptions';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';


export class CdkApprovalLambdaUrlsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);


    // --context email=your@mail
    const Email = this.node.tryGetContext('email');

    const SNSHumanApprovalEmailTopic = new sns.Topic(this, 'SNSHumanApprovalEmailTopic');
    SNSHumanApprovalEmailTopic.addSubscription(new subs.EmailSubscription(Email));

    const CloudWatchLogsPolicy = new iam.PolicyDocument({
      statements: [new iam.PolicyStatement({
        actions: [
          'logs:*',
        ],
        resources: ['*'],
      })],
    });

    const StepFunctionsPolicy = new iam.PolicyDocument({
      statements: [new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "states:SendTaskFailure",
          "states:SendTaskSuccess"
        ],
        resources: ['*'],
      })],
    });

    const LambdaStepFunctionsIAMRole = new iam.Role(this, 'LambdaStepFunctionsIAMRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      inlinePolicies: {
        CloudWatchLogsPolicy: CloudWatchLogsPolicy,
        StepFunctionsPolicy: StepFunctionsPolicy
      },
    });

    const LambdaApprovalFunction = new lambda.Function(this, 'LambdaApprovalFunction', {
      runtime: lambda.Runtime.NODEJS_16_X,
      handler: 'approval.handler',
      code: lambda.Code.fromAsset('lambda'),
      retryAttempts: 0,
      timeout: cdk.Duration.seconds(60),
      role: LambdaStepFunctionsIAMRole,
    });

    const SNSSendEmailPolicy = new iam.PolicyDocument({
      statements: [new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "SNS:Publish"
        ],
        resources: ['*'],
      })],
    });
    const LambdaSendEmailExecutionRole = new iam.Role(this, 'LambdaSendEmailExecutionRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      inlinePolicies: {
        CloudWatchLogsPolicy: CloudWatchLogsPolicy,
        SNSSendEmailPolicy: SNSSendEmailPolicy
      },
    });

    const LambdaHumanApprovalSendEmailFunction = new lambda.Function(this, 'LambdaHumanApprovalSendEmailFunction', {
      runtime: lambda.Runtime.NODEJS_16_X,
      handler: 'send_email.handler',
      code: lambda.Code.fromAsset('lambda'),
      retryAttempts: 0,
      environment: { 'SNS_ARN': SNSHumanApprovalEmailTopic.topicArn },
      timeout: cdk.Duration.seconds(60),
      role: LambdaSendEmailExecutionRole,
    });

    const InvokeCallbackLambdaPolicy = new iam.PolicyDocument({
      statements: [new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "lambda:InvokeFunction"
        ],
        resources: [LambdaHumanApprovalSendEmailFunction.functionArn],
      })],
    });
    const LambdaStateMachineExecutionRole = new iam.Role(this, 'LambdaStateMachineExecutionRole', {
      assumedBy: new iam.ServicePrincipal('states.amazonaws.com'),
      inlinePolicies: {
        InvokeCallbackLambdaPolicy: InvokeCallbackLambdaPolicy,
      },
    });

    const fnUrl = LambdaApprovalFunction.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
    });

    const lambdaCallback = new tasks.LambdaInvoke(this, 'Lambda Callback', {
      lambdaFunction: LambdaHumanApprovalSendEmailFunction,
      integrationPattern: sfn.IntegrationPattern.WAIT_FOR_TASK_TOKEN,
      retryOnServiceExceptions: false,
      payload: sfn.TaskInput.fromObject({
        token: sfn.JsonPath.taskToken,
        "ExecutionContext.$": "$$",
        "LambdaURL": fnUrl.url
      }),
    });

    const ApprovedPassState = new sfn.Pass(this, 'ApprovedPassState');
    const RejectedPassState = new sfn.Pass(this, 'RejectedPassState');

    const definition = lambdaCallback
      .next(new sfn.Choice(this, 'ManualApprovalChoiceState')
        .when(sfn.Condition.stringEquals('$.Status', 'Approved! Task approved by ${Email}'), ApprovedPassState)
        .otherwise(RejectedPassState)
      );

    new sfn.StateMachine(this, 'HumanApprovalLambdaStateMachine', {
      role: LambdaStateMachineExecutionRole,
      definition,
      timeout: cdk.Duration.minutes(5),
    });

    new cdk.CfnOutput(this, 'FunctionURL', { value: fnUrl.url });

  }
};
