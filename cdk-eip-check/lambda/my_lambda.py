import os

import boto3
from botocore.config import Config

CHECK = "charged EIP"


def send_sns(message, subject):
    print("--- in send_sns")
    client = boto3.client("sns")
    topic_arn = os.environ["SNS_ARN"]
    client.publish(TopicArn=topic_arn, Message=message, Subject=subject)


def available_regions(service):
    regions = []
    client = boto3.client(service)
    response = client.describe_regions()
    for item in response["Regions"]:
        regions.append(item["RegionName"])
    return regions


def find_charged_eip(client, region, eips, out):
    """Check EIP is associated to the running EC2 instance. (If not charged.)"""
    for eip in eips:
        try:
            response = client.describe_instances(
                InstanceIds=[eip["InstanceId"]])
            ec2_status = response["Reservations"][0]["Instances"][0]["State"]["Name"]

            if ec2_status != "running":
                mes = f"EIP associated to the stopped instance. {region}, {eip['AllocationId']}"
                out.append(mes)
                print(mes)

        except KeyError:
            mes = f"EIP unassociated. {region}, {eip['AllocationId']}"
            out.append(mes)
            print(mes)

    return out


def main():
    print(f"Checking for {CHECK} ...")
    out = []
    regions = available_regions("ec2")

    for region in regions:
        my_config = Config(region_name=region)
        client = boto3.client("ec2", config=my_config)
        filters = [{"Name": "domain", "Values": ["vpc"]}]

        response = client.describe_addresses(Filters=filters)
        eips = response["Addresses"]

        if eips:
            out = find_charged_eip(client, region, eips, out)

    if out:
        print("--- under out if")
        out.insert(0, f"{len(out)} found: {CHECK}")
        out = "\n".join(out)

        send_sns(out, f"Found {CHECK}")
        print(" --- after sned_sns")

    else:
        print(f"No {CHECK}")


def handler(event, context):
    main()
    return {'statusCode': 200}
