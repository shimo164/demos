This CDK project is for the Medium post:

“This Stack Will Self-Destruct After Lambda Function Executed”

https://medium.com/@shimo164/this-stack-will-self-destruct-after-lambda-function-executed-261dc3c0fb04


[CloudFormation yaml is here.](https://github.com/shimo164/demos/tree/main/cfn-templates/self-destruct)

## Build
To build this app, you need to be in this example's root folder. Then run the following:
```bash
npm install -g aws-cdk
npm install
npm run build
```
This will install the necessary CDK, then this example's dependencies, and then build your TypeScript files and your CloudFormation template.

## Deploy
Run ```cdk deploy```. This will deploy / redeploy your Stack to your AWS Account.
