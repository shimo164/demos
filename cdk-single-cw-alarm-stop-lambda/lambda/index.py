import os
from datetime import datetime, timedelta

import boto3


def send_sns(message, subject):
    client = boto3.client("sns")
    topic_arn = os.environ["SNS_ARN"]
    client.publish(TopicArn=topic_arn, Message=message, Subject=subject)


def get_invocation_top_functions():
    """
    Check which functions are invoked many times
    """
    range_minutes = 5
    cloud_watch = boto3.client("cloudwatch")

    response = cloud_watch.get_metric_data(
        MetricDataQueries=[
            {
                "Id": "q1",
                "Expression": """
                    SELECT SUM(Invocations)
                    FROM SCHEMA(\"AWS/Lambda\", FunctionName)
                    GROUP BY FunctionName
                    ORDER BY SUM() DESC
                    """,
                "Period": 60,
                "Label": "Invocation top",
            },
        ],
        StartTime=datetime.now() - timedelta(minutes=range_minutes),
        EndTime=datetime.now(),
    )

    return response


def handler(event, context):

    threshold_lambda_stop = int(os.environ["THRESHOLD_LAMBDA_STOP"])

    response = get_invocation_top_functions()

    # Count invocation in range_minutes for each function
    # If the count is more than threshold, throttle the function
    for fn in response["MetricDataResults"]:
        count = sum(fn["Values"])
        fn_name = fn["Label"].split()[-1]

        if count >= threshold_lambda_stop:
            client = boto3.client("lambda")
            response = client.put_function_concurrency(
                FunctionName=fn_name, ReservedConcurrentExecutions=0
            )

            # Notify
            if response["ResponseMetadata"]["HTTPStatusCode"] == 200:
                message = f"Lambda: {fn_name} was throttled. Count in 5 minutes: {count}."
                subject = "Lambda throttled."
                send_sns(message, subject)
            else:  # Verbose
                message = f"Failed throttling Lambda: {fn_name}. Count in 5 minute: {count}."
                subject = "Failed to throttle."
                send_sns(message, subject)
