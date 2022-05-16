// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./NFTFactory.sol";

contract NFTLend is NFTFactory {
    struct lendedNFT {
        string nftKey;
        address lenderAddress;
        address borrowerAddress;
        uint32 dueDate; // Time available for renting nft (in UTC)
        uint256 dailyRent; // Amount of rent to be paid per day - in wei
        uint256 collateral; // Amount of collateral required - in wei
    }

    // Key strings of nfts available to rent on app
    string[] internal nftKeysListAvaiableForRent;

    // Mapping of nft key to lended nft details
    mapping(string => lendedNFT) public nftKeyToLendedNftDetails;

    function getNftKeysListAvaiableForRent()
        public
        view
        returns (string[] memory)
    {
        return nftKeysListAvaiableForRent;
    }
}
