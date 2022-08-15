# Send Alerts with Amazon SNS When You Are Being Charged for EIPs

Described in [this medium post](https://medium.com/@shimo164/send-alerts-with-amazon-sns-when-you-are-being-charged-for-eips-5d6a9b838a2f)

## Preparation

- Amazon SNS Topic is required.


- create a `.env` file and write SNS_ARN for you AWS SNS Topic.

```
SNS_ARN=arn:aws:sns:<region>:<account_id>:hoge
```


* `npm install`  Run to install node_modules

* `cdk deploy`      deploy this stack to your default AWS account/region
