const { MerkleTree } = require("merkletreejs");
const keccak256 = require("keccak256");
const { ethers } = require("hardhat");
const walletAndIds = require("../wallets/walletList");

var merkleTree, root;
function hashToken(tokenId, account) {
  return Buffer.from(
    ethers
      .solidityPackedKeccak256(["uint256", "address"], [tokenId, account])
      .slice(2),
    "hex"
  );
}

function generateMerkleProof(tokenId, account) {
  var elementHash = hashToken(tokenId, account); 
  var proofs = merkleTree.getHexProof(elementHash);
  return proofs;
}

function getRootFromMT() {
    var elementosHasheados = walletAndIds.map(({ id, address }) => {
      return hashToken(id, address);
    });
    merkleTree = new MerkleTree(elementosHasheados, keccak256, {
      sortPairs: true,
    });

    root = merkleTree.getHexRoot();

    console.log(root);
    return root;
}

module.exports = { getRootFromMT, generateMerkleProof };
