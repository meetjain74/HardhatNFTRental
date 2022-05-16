// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./NFTLend.sol";
import "./NFTRent.sol";

contract NFTUser is NFTLend, NFTRent {
    struct User {
        address userAddress; // Address of user of app
        // String for mappings is nftKey
        mapping(string => lendedNFT) userLendedNfts;
        string[] userLendedNftsList;
        mapping(string => rentedNFT) userRentedNfts;
        string[] userRentedNftsList;
        mapping(string => lendedNFT) userWishlist;
        string[] userWishlistList;
    }

    // Mapping of user address to user details
    mapping(address => User) public addressToUser;

    function getUserLendedNFTDetails(
        address _userAddress,
        string memory _nftKey
    ) public view returns (lendedNFT memory) {
        // Should not be a zero address
        require(_userAddress != address(0), "Invalid address");

        User storage user = addressToUser[_userAddress];

        // User should exist
        require(user.userAddress != address(0), "User does not exists");

        // The nft _nftKey should exist in user lended NFTs
        require(
            user.userLendedNfts[_nftKey].lenderAddress != address(0),
            "User does not have any such lended Nft"
        );

        return user.userLendedNfts[_nftKey];
    }

    function getUserLendedNFTListDetails(address _userAddress, uint256 _index)
        public
        view
        returns (string memory)
    {
        // Should not be a zero address
        require(_userAddress != address(0), "Invalid address");

        User storage user = addressToUser[_userAddress];

        // User should exist
        require(user.userAddress != address(0), "User does not exists");

        // Index should be less than userLendedNftsList size
        require(
            _index < user.userLendedNftsList.length,
            "Nft at the given index does not exist"
        );

        return user.userLendedNftsList[_index];
    }

    function getUserRentedNFTDetails(
        address _userAddress,
        string memory _nftKey
    ) public view returns (rentedNFT memory) {
        // Should not be a zero address
        require(_userAddress != address(0), "Invalid address");

        User storage user = addressToUser[_userAddress];

        // User should exist
        require(user.userAddress != address(0), "User does not exists");

        // The nft _nftKey should exist in user rented NFTs
        require(
            user.userRentedNfts[_nftKey].borrowerAddress != address(0),
            "User does not have any such rented Nft"
        );

        return user.userRentedNfts[_nftKey];
    }

    function getUserRentedNFTListDetails(address _userAddress, uint256 _index)
        public
        view
        returns (string memory)
    {
        // Should not be a zero address
        require(_userAddress != address(0), "Invalid address");

        User storage user = addressToUser[_userAddress];

        // User should exist
        require(user.userAddress != address(0), "User does not exists");

        // Index should be less than userRentedNftsList size
        require(
            _index < user.userRentedNftsList.length,
            "Nft at the given index does not exist"
        );

        return user.userRentedNftsList[_index];
    }

    function addUser(address _userAddress) external {
        // Should not be a zero address
        require(_userAddress != address(0), "Invalid address");

        // msg.sender should be equal to _userAddress
        require(
            msg.sender == _userAddress,
            "Only the user can add his account to app"
        );

        // Check if user already exist or not
        if (addressToUser[_userAddress].userAddress == address(0)) {
            // User does not exist
            User storage newUser = addressToUser[_userAddress];
            newUser.userAddress = _userAddress;
            userAddressList.push(_userAddress);
        }
    }
}
