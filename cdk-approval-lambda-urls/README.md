This repo folder is for my medium post. [Lambda Function URLs for Approval Actions in StepFunctions](https://medium.com/@shimo164/lambda-function-urls-for-approval-actions-in-stepfunctions-eeea1eba15e2)


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
