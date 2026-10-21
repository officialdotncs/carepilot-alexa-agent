# CarePilot - AWS Bedrock Integration Friction Log

**Project:** CarePilot - simulated Alexa+ care-coordination web experience  
**Repository:** https://github.com/officialdotncs/carepilot-alexa-agent  
**Service:** Amazon Bedrock - Amazon Nova Lite (`amazon.nova-lite-v1:0`)  
**Severity:** High - the summary workflow could not complete live inference until the configuration issues were resolved.

## Task attempted

Integrate Amazon Bedrock into CarePilot so the agent's `produce_summary` workflow can submit structured care-coordination context to a server-side Edge Function and receive a generated summary without exposing AWS credentials to the browser.

## Steps taken

1. Implemented a server-side `bedrock-summary` Edge Function and configured AWS credentials as server-side secrets.
2. Tested a real request using the deployed function and a fictional test recipient.
3. Diagnosed a model invocation failure with the initial Titan Text Express configuration and moved to `amazon.nova-lite-v1:0`.
4. Updated the request body and response parsing to match Nova Lite's message-based format.
5. Investigated a `403` response showing that the IAM user's policy did not allow `bedrock:InvokeModel` on the selected Nova Lite model resource.
6. Updated the IAM permission for the selected model and checked the request-signing implementation.
7. Corrected the SigV4 canonical URI encoding for the colon in the model ID while keeping the fetch URL in the form accepted by the runtime.
8. Repeated the real request and verified the returned result.

## Expected result

A valid request to the deployed Edge Function should authenticate to Amazon Bedrock, invoke the configured Nova Lite model, and return non-empty generated summary text. AWS credentials should remain server-side and failures should continue to use a clearly identified safe fallback.

## Actual result

The workflow initially failed. The investigation surfaced separate configuration issues: the initial model configuration returned an invocation error; after switching models, the IAM policy still referenced the previous model; request signing also required careful handling of the model ID's colon. The Bedrock Playground alone did not prove that CarePilot's separate IAM user could invoke the model.

After correcting the model-specific request/response format, IAM permission, and canonical URI handling, the deployed function returned **HTTP 200**, `source: amazon_bedrock`, model `amazon.nova-lite-v1:0`, and non-empty generated summary text in a real request.

## Workaround used

- Switched to Amazon Nova Lite and updated the model request and response parsing.
- Granted the dedicated IAM user permission to invoke the selected foundation model.
- Corrected the canonical URI encoding used for AWS Signature Version 4.
- Kept credentials in server-side secrets, preserved response validation, and retained the local fallback for failure cases.

## Actionable suggestion

Provide a verified end-to-end server-side Nova Lite example that includes the model ID, exact IAM `foundation-model` ARN, model-specific request and response format, and SigV4 canonical request behaviour. Troubleshooting documentation should clearly distinguish IAM denials, model availability/configuration errors, signature mismatches, and response parsing errors. A safe diagnostic view that reports the category of failure without leaking raw AWS error bodies or credentials would further reduce debugging time.

## Evidence and scope notes

- Live invocation reported: HTTP 200; `source: amazon_bedrock`; model `amazon.nova-lite-v1:0`; non-empty generated summary.
- Automated checks reported after integration changes: 45 tests passed, TypeScript typecheck passed, production build passed.
- The friction described above was resolved for the tested invocation. This log does not claim that every browser interaction has been manually tested.
- All care-recipient data used in the demo is fictional. CarePilot does not book appointments, order medication, contact providers, or execute real-world care actions.
