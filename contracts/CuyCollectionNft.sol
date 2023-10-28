// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

contract CuyCollectionNft is Initializable, ERC721Upgradeable, PausableUpgradeable, AccessControlUpgradeable, ERC721BurnableUpgradeable, UUPSUpgradeable {
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    bytes32 public root;

    event Burn(address account, uint256 id);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() initializer public {
        __ERC721_init("JuanLazarte NFTs", "JLC");
        __Pausable_init();
        __AccessControl_init();
        __ERC721Burnable_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(UPGRADER_ROLE, msg.sender);
    }

    function _baseURI() internal pure override returns (string memory) {
        return "ipfs://Qma3hWpkKoUyvEo65wq9SYKpet1SPRuQD5zhoqMapuaqdU/";
    }

    function safeMint(
        address to,
        uint256 tokenId
    ) public onlyRole(MINTER_ROLE) whenNotPaused {
        require(tokenId < 999, "Id invalido");
        _safeMint(to, tokenId);
    }

    function safeMintWhiteList(
        address to,
        uint256 tokenId,
        bytes32[] calldata proofs
    ) public whenNotPaused {
        require(tokenId > 999 && tokenId <= 1999, "Id invalido");
        require(
            verify(_buscarInfo(to, tokenId), proofs), "No eres parte de la lista"
        );
        _safeMint(to, tokenId);
    }

    function _buscarInfo(address to, uint256 tokenId) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(tokenId, to));
        
    }

    function verify(bytes32 leaf, bytes32[] memory proofs) public view returns (bool) {
        return MerkleProof.verify(proofs, root, leaf);
    }

    function verifyMerkleProof(bytes32 leaf, bytes32[] memory proofs) public view returns (bool) {
        bytes32 hashInfo = leaf;
        for (uint256 i = 0; i < proofs.length; i++) {
            bytes32 proof = proofs[i];

            if(hashInfo < proof) {
                hashInfo = keccak256(abi.encodePacked(hashInfo, proof));
            } else {
                hashInfo = keccak256(abi.encodePacked(proof, hashInfo));
            }
        }
        return hashInfo == root;
    }
    

    function buyBack(uint256 id) public {
        _burn(id);
        emit Burn(msg.sender, id);
    }

    function transfer(address to, uint256 id) public {
        _transfer(msg.sender, to, id);
        emit Transfer(msg.sender, to, id);
    }

    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function _authorizeUpgrade(address newImplementation)
        internal
        onlyRole(UPGRADER_ROLE)
        override
    {}

    function updateRoot(bytes32 _root) public {
        root = _root;
    }

    // The following functions are overrides required by Solidity.
    function supportsInterface(bytes4 interfaceId)
        public 
        view
        override(ERC721Upgradeable, AccessControlUpgradeable)
        returns (bool)
        {
            return super.supportsInterface(interfaceId);
        }
}
