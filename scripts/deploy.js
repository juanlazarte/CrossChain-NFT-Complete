require("dotenv").config();

const {
  getRole,
  verify,
  ex,
  printAddress,
  deploySC,
  deploySCNoUp,
  verifyNoUp,
} = require("../utils");

const { getRootFromMT } = require("../utils/merkleTree");

var MINTER_ROLE = getRole("MINTER_ROLE");
var BURNER_ROLE = getRole("BURNER_ROLE");

// Publicar NFT en Mumbai
async function deployMumbai() {
  var relAddMumbai = "0x08C3753774057746aeC99427e8545727d8317DF9"

  // utiliza deploySC
  var proxyContract = await deploySC("CuyCollectionNft", []);
  // utiliza printAddress
  var implementacionAddNft = await printAddress("CuyCollectionNft", await proxyContract.getAddress());
  // utiliza ex
  await ex(proxyContract, "updateRoot", [getRootFromMT()], "Failed");
  // utiliza ex
  await ex(proxyContract, "grantRole", [MINTER_ROLE, relAddMumbai], "Failed");
  // utiliza verify
  await verify(implementacionAddNft, "CuyCollectionNft", []);
}

// Publicar UDSC, Public Sale y Bbites Token en Goerli
async function deployGoerli() {
  var relAddGoerli = "0x7Eb5D4A8ab495bb4cBB32bEA156766d4CFf7eD06"

  // var bbtokn
  var bbitesTokenContract = await deploySC("BBitesToken", []);
  var impBT = await printAddress("BBitesToken", await bbitesTokenContract.getAddress()); 
  var bbitesTokenAddress = await bbitesTokenContract.getAddress();

  //usdc

  var usdcContract = await deploySCNoUp("USDCoin", []);
  var usdcAddress = await usdcContract.getAddress();

  //set up
  await ex(bbitesTokenContract, "grantRole", [MINTER_ROLE, relAddGoerli], "Failed");

  await verify(impBT, "BBitesToken", []);
  await verifyNoUp(usdcContract);

  //psC Contract
  var routerAdd = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
  var psContract = await deploySC("PublicSale", [bbitesTokenAddress, usdcAddress, routerAdd]);
  var impPS = await printAddress("PublicSale", await psContract.getAddress());

  await verify(impPS, "PublicSale", []);
  
}


//deployMumbai()
   deployGoerli()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
