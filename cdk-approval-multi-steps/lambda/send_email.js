const AWS = require('aws-sdk');
const crypto = require('crypto');

const s3 = new AWS.S3();
const sns = new AWS.SNS();

const generateUuid = () => crypto.randomBytes(6).toString('hex');

const getCurrentDateTime = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  return `${year}${month}${day}-${hours}${minutes}${seconds}`;
};

const generateHtml = (url1, url2) => `
  <!DOCTYPE html>
  <html>
    <head>
      <title>Approval Page</title>
      <style>
        .button {
          color: #16191f;
          font-family: 'Helvetica Neue', Roboto, Arial, sans-serif;
          font-size: 60px;
          font-weight: 700;
          letter-spacing: 0.75px;

          padding: 12px 60px;
          border-radius: 6px;
          cursor: pointer;
        }

        .button_approval {
          background-color: #ff9900;
          border: 1px solid #ff9900;
        }

        .button_approval:hover {
          background-color: #ec7211;
          border: 1px solid #ec7211;
        }

        .button_reject {
          background-color: #fff;
          border: 1px solid #545b64;
          color: #545b64;
        }

        .button_reject:hover {
          background-color: #fafafa;
          border: 1px solid #000;
          color: #000;
        }
      </style>
      <script>
        const approvalUrl = '${url1}';
        const rejectUrl = '${url2}';

        function confirmApproval() {
          if (confirm('Approval OK?')) {
            window.location.href = approvalUrl;
          }
        }

        function confirmReject() {
          if (confirm('Reject OK?')) {
            window.location.href = rejectUrl;
          }
        }
      </script>
    </head>
    <body>
      <div>
        <button class="button button_reject" onclick="confirmReject()">
          Reject
        </button>
        <button class="button button_approval" onclick="confirmApproval()">
          Approval
        </button>
      </div>
    </body>
  </html>
`;

exports.handler = async (event) => {
  const { SNS_ARN: snsArn, BUCKET_NAME: bucketName } = process.env;

  const uuid = generateUuid();
  const dateTime = getCurrentDateTime();
  const htmlFilename = `${dateTime}-${uuid}.html`;

  console.log(`event= ${JSON.stringify(event)}`);

  const { Execution } = event.ExecutionContext;

  const bucket = bucketName;
  const file = htmlFilename;

  const { Name: statemachineName } = event.ExecutionContext.StateMachine;

  const { Token: taskToken } = event.ExecutionContext.Task;

  const { LambdaURL: functionURL } = event;

  const approveEndpoint = `${functionURL}?bucket=${bucket}&file=${file}&action=approve&ex=${
    Execution.Name
  }&sm=${statemachineName}&taskToken=${encodeURIComponent(taskToken)}`;
  const rejectEndpoint = `${functionURL}?bucket=${bucket}&file=${file}&action=reject&ex=${
    Execution.Name
  }&sm=${statemachineName}&taskToken=${encodeURIComponent(taskToken)}`;

  const url1 = approveEndpoint;
  const url2 = rejectEndpoint;

  const htmlContent = generateHtml(url1, url2);

  const paramsS3 = {
    Body: htmlContent,
    Bucket: bucketName,
    Key: htmlFilename,
    ContentType: 'text/html',
  };

  try {
    await s3.putObject(paramsS3).promise();
    console.log(`Uploaded HTML file to ${bucketName}/${htmlFilename}`);
  } catch (error) {
    console.error(`Error uploading HTML file: ${error.message}`);
    throw error;
  }

  const objectURL = `https://${bucketName}.s3.ap-northeast-1.amazonaws.com/${htmlFilename}`;

  const emailMessage = `This is an email requiring an approval for a step functions execution.

  Please access the page from the below URL and select "Approval" or "Reject".

  URL: ${objectURL}`;

  const paramsSns = {
    Message: emailMessage,
    Subject: 'Required approval from AWS Step Functions',
    TopicArn: snsArn,
  };

  try {
    const data = await sns.publish(paramsSns).promise();
    console.log('MessageID is ' + data.MessageId);
  } catch (err) {
    console.error(err, err.stack);
    throw err;
  }
};
