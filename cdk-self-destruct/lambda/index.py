import time


def handler(event, context):

    print("Do something here!")
    time.sleep(5)

    return {'statusCode': 200}
