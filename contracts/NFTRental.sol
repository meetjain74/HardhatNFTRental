// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "hardhat/console.sol";
//import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract NFTRental {

    // Structure for storing nft properties
    struct nftProps {
        string nftKey; // Key is unique string and concatenation of nftAddress and nftId

        address nftOwner;
        address nftAddress;
        uint256 nftId;
        uint32 wishlistCount; // No of users having this nft in wishlist

        string nftName;
        string nftImageURL;
    }

    struct lendedNFT {
        string nftKey;
        address lenderAddress;
        uint32 dueDate; // Time available for renting nft (in UTC)
        uint256 dailyRent; // Amount of rent to be paid per day - in wei
        uint256 collateral; // Amount of collateral required - in wei
    }

    struct rentedNFT {
        string nftKey;
        address borrowerAddress;
        uint16 numberOfDays; // number of days you want to buy nft on rent
        uint32 rentalStartTime;
    }

    struct User {
        address userAddress; // Address of user of app 

        mapping (uint32 => lendedNFT) userLendedNfts;
        uint32 userLendedNftsSize;

        mapping (uint32 => rentedNFT) userRentedNfts;
        uint32 userRentedNftsSize;

        mapping (uint32 => lendedNFT) userWishlist;
        uint32 userWishlistSize;

        // lendedNFT[] userLendedNfts;
        // rentedNFT[] userRentedNfts;
        // lendedNFT[] userWishlist;
    }

    // Key strings of nfts available to rent on app
    string[] private nftKeysListAvaiableForRent;

    // Mapping of above key to nftProps
    mapping (string => nftProps) public nftKeyToNftProps;

    // Address of all the users of the app
    address[] private userAddressList;

    // Mapping of user address to user details
    mapping (address => User) public addressToUser;

    // Events
    event NFTLended(); 

    function getUserAddressList() public view returns(address[] memory) {
        return userAddressList;
    }

    function getNftKeysListAvaiableForRent() public view returns(string[] memory) {
        return nftKeysListAvaiableForRent;
    }

    function getUserLendedNFTDetails(address _userAddress,uint32 _index) public view returns(lendedNFT memory) {
        User storage user = addressToUser[_userAddress];

        // User should exist
        require(user.userAddress!=address(0),"User does not exists");

        // Index should be less than userLendedNftsSize
        require(_index<user.userLendedNftsSize,"Nft at the given index does not exist");

        return user.userLendedNfts[_index];
    }

    function addUser(address _userAddress) external {
        // Check if user already exist or not
        if (addressToUser[_userAddress].userAddress==address(0)) {
            // User does not exist
            User storage newUser = addressToUser[_userAddress];
            newUser.userAddress=_userAddress;
            newUser.userLendedNftsSize=0;
            newUser.userRentedNftsSize=0;
            newUser.userWishlistSize=0;

            userAddressList.push(_userAddress);
        }
    }

    // Main lend function called by frontend
    function addNFTToLend(
        string memory _nftKey,
        address _nftOwner,
        address _nftAddress,
        uint256 _nftId,
        uint32 _wishlistCount, 
        string memory _nftName,
        string memory _nftImageURL,
        address _lenderAddress,
        uint32 _dueDate,
        uint256 _dailyRent,
        uint256 _collateral
    ) external {
        // Lender address should exist in our app
        require(addressToUser[_lenderAddress].userAddress!=address(0),"User does not exist");

        // NFT should not already available for renting
        //There is no proper way to check if a key already exists or not therefore we are checking for default value i.e., all bits are 0
        require(nftKeyToNftProps[_nftKey].nftAddress==address(0),"NFT is already available for renting");

        // Owner of nft address and lender address must be same
        require(_nftOwner==_lenderAddress,"Non NFT Owner");

        // Due date should be after current time
        require(_dueDate>block.timestamp,"Bad time bounds");

        // Wishlist count of new Nft listed for available for renting should be 0
        require(_wishlistCount==0,"New NFT can't be in any users wishlist yet");

        nftProps memory newNFT = nftProps(_nftKey,_nftOwner,_nftAddress,_nftId,_wishlistCount,_nftName,_nftImageURL);
        nftKeyToNftProps[_nftKey] = newNFT;
        _lendNFT(_nftKey,_lenderAddress,_dueDate,_dailyRent,_collateral);
    }

    function _lendNFT(
        string memory _nftKey,
        address _lenderAddress,
        uint32 _dueDate,
        uint256 _dailyRent,
        uint256 _collateral
    ) private {
        lendedNFT memory newLend = lendedNFT(_nftKey,_lenderAddress,_dueDate,_dailyRent,_collateral);
        User storage currentUser = addressToUser[_lenderAddress];
        uint32 lendSize = currentUser.userLendedNftsSize;
        currentUser.userLendedNfts[lendSize] = newLend;
        currentUser.userLendedNftsSize++;

        nftKeysListAvaiableForRent.push(_nftKey);
        emit NFTLended();
    }

    

    
    //nftProps[] nftsAvailableForRent;

    // String is concatenation of nft props 
    // Represents details of nfts available for rent 
    // mapping (string => lendedNFT) nftToLendDetails;

    // function _getNftKey(nftProps memory _nft) public view returns(string memory) {
    //     string memory temp = string(abi.encodePacked(_nft.nftAddress,_nft.nftId));
    //     console.log(temp);
    //     return temp;
    // }

    // function createNFT(address _nftAddress,uint256 _nftId,uint32 _wishlistCount) public pure returns(nftProps memory) {
    //     nftProps memory myStruct = nftProps(_nftAddress,_nftId,_wishlistCount);
    //     return myStruct;
    // }
}