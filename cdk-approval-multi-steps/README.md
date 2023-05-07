This repo folder is for my blog post. [StepFunctions Approval Action with One-Time HTML Page Confirmation](https://dev.to/aws-builders/stepfunctions-approval-action-with-one-time-html-page-confirmation-4og7)


## Build
To build this app, you need to be in this example's root folder. Then run the following:
```sh
npm install -g aws-cdk
npm install
npm run build
```
This will install the necessary CDK, then this example's dependencies, and then build your TypeScript files and your CloudFormation template.

## Deploy
Run ```cdk deploy --context email=your@mail-address --context bucket=your-bucket```.
This will deploy / redeploy your Stack to your AWS Account.

Note:
- `--context email=your@mail-address` is required to create SNS.
- `--context bucket=your-bucket` is required to set your S3 bucket. This bucket must be publically accessible.
