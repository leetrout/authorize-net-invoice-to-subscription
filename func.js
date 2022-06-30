require("dotenv").config();
const axios = require("axios").default;
const ApiContracts = require("authorizenet").APIContracts;
const ApiControllers = require("authorizenet").APIControllers;
const Constants = require("authorizenet").Constants;

const useProd =
  process.env.AUTH_USE_PROD && process.env.AUTH_USE_PROD.toLowerCase() == "yes";

exports.subscriptionForInvoice = async (req, res) => {
  if (req.get("content-type") !== "application/json") {
    console.error("request is not application/json");
    res.status(400).send(`bad request`);
    return;
  }

  console.info("payload entity", req.body.payload.entityName);
  switch (req.body.payload.entityName) {
    case "subscription":
      return await addSubscriptionIds(req, res, [req.body.payload.id]);
    case "transaction":
      return await getTransaction(req, res, req.body.payload.id);
    default:
      console.info("payload id", req.body.payload.id);
      console.info("payload kind", req.body.payload.entityName);
      console.error("request kind is not supported");
      res.status(400).send("bad request");
      return;
  }
};

async function getTransaction(req, res, txID) {
  console.info("getTransaction", txID);
  const merchantAuthenticationType =
    new ApiContracts.MerchantAuthenticationType();
  merchantAuthenticationType.setName(process.env.AUTH_API_LOGIN_ID);
  merchantAuthenticationType.setTransactionKey(
    process.env.AUTH_TRANSACTION_KEY
  );

  const txDetailsReq = new ApiContracts.GetTransactionDetailsRequest();
  txDetailsReq.setMerchantAuthentication(merchantAuthenticationType);
  txDetailsReq.setTransId(txID);

  const ctrl = new ApiControllers.GetTransactionDetailsController(
    txDetailsReq.getJSON()
  );

  if (useProd) {
    ctrl.setEnvironment(Constants.endpoint.production);
  }

  ctrl.execute(async function () {
    const apiResponse = ctrl.getResponse();
    const response = new ApiContracts.GetTransactionDetailsResponse(
      apiResponse
    );

    if (response != null) {
      if (
        response.getMessages().getResultCode() ==
        ApiContracts.MessageTypeEnum.OK
      ) {
        const tx = response.getTransaction();
        const sub = tx.getSubscription();
        if (sub) {
          console.info("found subscription on transaction", sub);
          return await addSubscriptionIds(req, res, [sub.id]);
        }
        const prof = tx.getProfile();
        if (prof) {
          console.info("found profile on transaction", prof);
          return await getProfile(req, res, prof.customerProfileId);
        }
        console.info("transaction data", tx);
        console.error("transaction did not contain subscription or profile");
      } else {
        console.error(response.getMessages().getResultCode());
        console.error(response.getMessages().getMessage()[0].getText());
      }
    } else {
      console.error("Null Response.");
    }
    res.status(400).send(`payment processor error`);
  });
}

async function getProfile(req, res, profileID) {
  console.info("getProfile", profileID);
  const merchantAuthenticationType =
    new ApiContracts.MerchantAuthenticationType();
  merchantAuthenticationType.setName(process.env.AUTH_API_LOGIN_ID);
  merchantAuthenticationType.setTransactionKey(
    process.env.AUTH_TRANSACTION_KEY
  );

  const customerProfReq = new ApiContracts.GetCustomerProfileRequest();
  customerProfReq.setMerchantAuthentication(merchantAuthenticationType);
  customerProfReq.setCustomerProfileId(profileID);

  const ctrl = new ApiControllers.GetCustomerProfileController(
    customerProfReq.getJSON()
  );

  if (useProd) {
    ctrl.setEnvironment(Constants.endpoint.production);
  }

  ctrl.execute(async function () {
    const apiResponse = ctrl.getResponse();
    const response = new ApiContracts.GetCustomerProfileResponse(apiResponse);

    if (response != null) {
      if (
        response.getMessages().getResultCode() ==
        ApiContracts.MessageTypeEnum.OK
      ) {
        const subIDs = response
          .getSubscriptionIds()
          .subscriptionId.map((s) => s.valueOf());
        return addSubscriptionIds(req, res, subIDs);
      } else {
        console.error(
          "customer profile error code: ",
          response.getMessages().getResultCode()
        );
        console.error(
          "customer profile error message: ",
          response.getMessages().getMessage()[0].getText()
        );
      }
    } else {
      console.error("Null Response.");
    }
    res.status(400).send(`payment processor error`);
  });
}

async function addSubscriptionIds(req, res, subIDs) {
  console.info("addSubscriptionIds", subIDs);
  req.body.subscriptionIds = subIDs;
  return axios
    .post(process.env.HOOKDECK_URL, req.body, {
      headers: "content-type: application/json",
    })
    .then(() => {
      console.info("updated payload sent: ", process.env.HOOKDECK_URL);
      res.send("ok");
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send("error sending modified payload", process.env.HOOKDECK_URL);
    });
}
