const { ethers } = require("ethers");
const {
  DefenderRelaySigner,
  DefenderRelayProvider,
} = require("@openzeppelin/defender-relay-client/lib/ethers");

exports.handler = async function (data) {
  const payload = data.request.body.events;

  const provider = new DefenderRelayProvider(data);
  const signer = new DefenderRelaySigner(data, provider, { speed: "fast" });

  var onlyEvents = payload[0].matchReasons.filter((e) => e.type === "event");
  if(onlyEvents.length === 0) return;

  var event = onlyEvents.filter((ev) => ev.signature.includes("PurchaseNftWithId"));

  var { account, id} = event[0].params;

  //Ejecutar mint en Mumbai del contrato CuyColletionNft
  var CuyCollectionNftAdd = "0x9F25d4Cfc7754Aa4559Fba18ED11F90157c517B4";
  var tokenAbi = ["function safeMint(address to, uint256 tokenId)"];
  var tokenContract = new ethers.Contract(CuyCollectionNftAdd, tokenAbi, signer);
  var mintTx = await tokenContract.safeMint(account, id);
  var res = await mintTx.wait();
  return res;
};
