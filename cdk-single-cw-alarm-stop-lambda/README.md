This repo folder is for post. [Suspend any Lambda functions using a single CloudWatch Alarm](https://dev.to/aws-builders/suspend-any-lambda-functions-using-a-single-cloudwatch-alarm-na9)

## Build
To build this app, you need to be in this example's root folder. Then run the following:
```bash
npm install -g aws-cdk
npm install
npm run build
```
This will install the necessary CDK, then this example's dependencies, and then build your TypeScript files and your CloudFormation template.

## Deploy
Run ```cdk deploy --context email=your@mail-address```. This will deploy / redeploy your Stack to your AWS Account.

Note the context  `--context email=your@mail-address` is required to create SNS.
