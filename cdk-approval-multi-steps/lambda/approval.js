const AWS = require('aws-sdk');

const redirectToStepFunctions = async (
  lambdaArn,
  statemachineName,
  executionName,
) => {
  const [arn, partition, , region, accountId] = lambdaArn.split(':');

  const executionArn = `${arn}:${partition}:states:${region}:${accountId}:execution:${statemachineName}:${executionName}`;
  console.log(`executionArn=${executionArn}`);

  const url = `https://console.aws.amazon.com/states/home?region=${region}#/executions/details/${executionArn}`;

  return {
    statusCode: 302,
    headers: {
      Location: url,
    },
  };
};

const deleteFileFromS3 = async (bucket, file) => {
  const s3 = new AWS.S3();
  const params = {
    Bucket: bucket,
    Key: file,
  };

  try {
    await s3.deleteObject(params).promise();
    console.log(`Deleted file: ${file}, in Bucket: ${bucket}`);
  } catch (err) {
    console.log(err, err.stack);
  }
};

exports.handler = async (event, context) => {
  console.log(`Event= ${JSON.stringify(event)}`);

  const {
    bucket,
    file,
    action,
    taskToken,
    sm: statemachineName,
    ex: executionName,
  } = event.queryStringParameters;

  await deleteFileFromS3(bucket, file);

  const email = process.env.EMAIL;
  let message = '';
  if (action === 'approve') {
    message = { Status: `Approved! Task approved by ${email}` };
  } else if (action === 'reject') {
    message = { Status: `Rejected! Task rejected by ${email}` };
  } else {
    console.error('Unrecognized action. Expected: approve, reject.');
    throw new Error('Failed to process the request. Unrecognized Action.');
  }

  const stepfunctions = new AWS.StepFunctions();
  try {
    await stepfunctions
      .sendTaskSuccess({
        output: JSON.stringify(message),
        taskToken: taskToken,
      })
      .promise();

    const response = await redirectToStepFunctions(
      context.invokedFunctionArn,
      statemachineName,
      executionName,
    );

    return response;
  } catch (err) {
    console.error(err, err.stack);
    throw err;
  }
};
