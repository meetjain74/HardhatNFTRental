// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";

import "./NFTUser.sol";

contract NFTHelper is NFTUser {
    // Events
    event NFTLended();
    event NFTRented();
    event NFTStopLended();
    event NFTCollateralClaimed();
    event NFTReturned();

    // Main lend function called by frontend
    function addNFTToLend(
        string memory _nftKey,
        address _nftOwner,
        address _nftAddress,
        uint256 _nftId,
        string memory _nftName,
        string memory _nftImageURL,
        address _lenderAddress,
        uint32 _dueDate,
        uint256 _dailyRent,
        uint256 _collateral
    ) external payable {
        // Can't lend anyone else's NFT
        require(msg.sender == _lenderAddress, "Can't lend someone else's NFT");

        // Lender address should exist in our app
        require(
            addressToUser[_lenderAddress].userAddress != address(0),
            "User does not exist"
        );

        // NFT should not already available for renting
        //There is no proper way to check if a key already exists or not therefore we are checking for default value i.e., all bits are 0
        require(
            nftKeyToNftProps[_nftKey].nftAddress == address(0),
            "NFT is already available for renting"
        );
        require(
            nftKeyToLendedNftDetails[_nftKey].lenderAddress == address(0),
            "NFT is already available for renting"
        );

        // Owner of nft address and lender address must be same
        require(_nftOwner == _lenderAddress, "Non NFT Owner");

        // Due date should be after current time
        require(_dueDate > block.timestamp, "Bad time bounds");

        // Transfer NFT to contract
        // ERC721 nftCollection = ERC721(_nftAddress);
        // nftCollection.safeTransferFrom(_lenderAddress,address(this),_nftId);

        nftProps memory newNFT = nftProps(
            _nftKey,
            _nftOwner,
            _nftAddress,
            _nftId,
            _nftName,
            _nftImageURL
        );
        nftKeyToNftProps[_nftKey] = newNFT;
        _lendNFT(_nftKey, _lenderAddress, _dueDate, _dailyRent, _collateral);
    }

    function _lendNFT(
        string memory _nftKey,
        address _lenderAddress,
        uint32 _dueDate,
        uint256 _dailyRent,
        uint256 _collateral
    ) private {
        lendedNFT memory newLend = lendedNFT(
            _nftKey,
            _lenderAddress,
            address(0),
            _dueDate,
            _dailyRent,
            _collateral
        );
        User storage currentUser = addressToUser[_lenderAddress];
        // uint32 lendSize = currentUser.userLendedNftsSize;
        currentUser.userLendedNfts[_nftKey] = newLend;
        currentUser.userLendedNftsList.push(_nftKey);
        // currentUser.userLendedNftsSize++;

        nftKeyToLendedNftDetails[_nftKey] = newLend;

        nftKeysListAvaiableForRent.push(_nftKey);
        emit NFTLended();
    }

    function rentNft(
        string memory _nftKey,
        address _borrowerAddress,
        uint16 _numberOfDays,
        uint32 _rentalStartTime
    ) external payable {
        _checkParamters(
            _nftKey,
            _borrowerAddress,
            _numberOfDays,
            _rentalStartTime
        );

        uint256 _dailyRent = nftKeyToLendedNftDetails[_nftKey].dailyRent;
        uint256 _collateral = nftKeyToLendedNftDetails[_nftKey].collateral;
        uint256 rentalPayment = _dailyRent * _numberOfDays;
        uint256 totalPayment = rentalPayment + _collateral;

        // Amount to be paid should be greater than or equal to rentalPayment
        require(
            msg.value >= totalPayment,
            "Can't rent NFT as insufficient amount paid"
        );

        // // Borrower address of the nft to be rented should be address(0)
        // This will always be true because we are deleting the mapping
        // require(nftKeyToLendedNftDetails[_nftKey].borrowerAddress==address(0),"NFT already rented by someone else");

        address lenderAddress = nftKeyToLendedNftDetails[_nftKey].lenderAddress;

        // Delete and update mappings
        _deleteAndUpdateMappings(
            _nftKey,
            _borrowerAddress,
            _numberOfDays,
            _rentalStartTime
        );

        // Payment

        if (msg.value > totalPayment) {
            // Transfer remaining amount back to his account
            address payable borrowerAddress_ = payable(_borrowerAddress);
            borrowerAddress_.transfer(msg.value - totalPayment);
        }

        // Transfer NFT to the borrower from contract

        // nftProps storage nft_ = nftKeyToNftProps[_nftKey];
        // ERC721 nftCollection = ERC721(nft_.nftAddress);
        // nftCollection.safeTransferFrom(address(this),_borrowerAddress,nft_.nftId);

        // Transfer rental payment to the lender

        address payable lenderAddress_ = payable(lenderAddress);
        lenderAddress_.transfer(rentalPayment);

        emit NFTRented();
    }

    function _checkParamters(
        string memory _nftKey,
        address _borrowerAddress,
        uint16 _numberOfDays,
        uint32 _rentalStartTime
    ) private view {
        // Borrower address should be msg.sender
        require(
            msg.sender == _borrowerAddress,
            "Can't borrow NFT for another borrower address"
        );

        // Borrower address should exist in our app
        require(
            addressToUser[_borrowerAddress].userAddress != address(0),
            "User does not exist"
        );

        nftProps storage nft_ = nftKeyToNftProps[_nftKey];

        // NFT should be available for renting i.e must exist in mapping
        //There is no proper way to check if a key already exists or not therefore we are checking for default value i.e., all bits are 0
        require(
            nft_.nftAddress != address(0),
            "NFT is not available for renting"
        );
        require(
            nftKeyToLendedNftDetails[_nftKey].lenderAddress != address(0),
            "NFT is not available for renting"
        );

        // Rental start time should be less than current time
        require(_rentalStartTime < block.timestamp, "Bad time bounds");

        uint32 rentalEndTime = _rentalStartTime +
            (uint32(_numberOfDays) * 1 days);
        uint32 _dueDate = nftKeyToLendedNftDetails[_nftKey].dueDate;
        require(
            rentalEndTime < _dueDate,
            "Can't rent NFT for more than amount of time available for renting"
        );
    }

    function _deleteAndUpdateMappings(
        string memory _nftKey,
        address _borrowerAddress,
        uint16 _numberOfDays,
        uint32 _rentalStartTime
    ) private {
        // Update borrower in lended user's nft
        address lenderAddress = nftKeyToLendedNftDetails[_nftKey].lenderAddress;

        // Lender should not be the borrower
        require(
            lenderAddress != _borrowerAddress,
            "Borrower address can't be the same as lender address"
        );

        User storage lender = addressToUser[lenderAddress];
        require(
            lender.userLendedNfts[_nftKey].borrowerAddress == address(0),
            "NFT already rented by someone else"
        );
        lender.userLendedNfts[_nftKey].borrowerAddress = _borrowerAddress;

        // Add nft in borrower address rented list

        rentedNFT memory newRentedNft = rentedNFT(
            _nftKey,
            lenderAddress,
            _borrowerAddress,
            _numberOfDays,
            _rentalStartTime
        );
        User storage renter = addressToUser[_borrowerAddress];

        // Nft should not be already in user rented Nfts
        // rentedNFT storage rentedNft_ = ;
        require(
            renter.userRentedNfts[_nftKey].borrowerAddress == address(0),
            "Nft is already present in user rented Nfts"
        );
        renter.userRentedNfts[_nftKey] = newRentedNft;
        renter.userRentedNftsList.push(_nftKey);

        // Add nft to app's rented nft list

        require(
            nftKeyToRentedNftDetails[_nftKey].borrowerAddress == address(0),
            "Nft is already present in user rented Nfts"
        );
        nftKeyToRentedNftDetails[_nftKey] = newRentedNft;

        // Remove nft from nfts available for rent

        uint256 _nftKeyIndex = _getElementIndex(_nftKey);
        _deleteElementAtIndex(_nftKeyIndex);
        delete nftKeyToLendedNftDetails[_nftKey];
    }

    function _getElementIndex(string memory _element)
        private
        view
        returns (uint256)
    {
        uint256 len = nftKeysListAvaiableForRent.length;
        for (uint256 i = 0; i < len; i++) {
            if (
                keccak256(abi.encodePacked(_element)) ==
                keccak256(abi.encodePacked(nftKeysListAvaiableForRent[i]))
            ) {
                return i;
            }
        }
        return len;
    }

    function _deleteElementAtIndex(uint256 _index) private {
        require(
            _index < nftKeysListAvaiableForRent.length,
            "Nft key not available in the app renting list"
        );

        uint256 _lastIndex = nftKeysListAvaiableForRent.length - 1;
        nftKeysListAvaiableForRent[_index] = nftKeysListAvaiableForRent[
            _lastIndex
        ];
        nftKeysListAvaiableForRent.pop();
    }

    // Called by lender
    function stopLend(string memory _nftKey) external {
        // Msg sender should exists
        User storage user = addressToUser[msg.sender];
        require(user.userAddress != address(0), "User does not exists");

        nftProps storage nft_ = nftKeyToNftProps[_nftKey];
        // uint tokenId = nft_.nftId;

        // Nft should be available in app
        require(nft_.nftAddress != address(0), "NFT is not available");

        // Nft should not be already rented
        lendedNFT storage lendNft_ = nftKeyToLendedNftDetails[_nftKey];
        require(lendNft_.lenderAddress != address(0), "NFT is already rented");
        require(
            lendNft_.borrowerAddress == address(0),
            "NFT is already rented"
        );

        // Msg sender should be lender address
        require(
            lendNft_.lenderAddress == msg.sender,
            "Can't stop lend someone else's NFT"
        );

        // Contract should be the current owner of the nft
        // ERC721 nftCollection = ERC721(nft_.nftAddress);
        // require(nftCollection.ownerOf(tokenId)==address(this),"Contract is not the owner of NFT");

        // User should have that nft as lend
        require(
            user.userLendedNfts[_nftKey].lenderAddress == msg.sender,
            "User does not have any such NFTs as lend"
        );

        // Delete mappings

        // Remove nft from nfts available for rent
        uint256 _nftKeyIndex = _getElementIndex(_nftKey);
        _deleteElementAtIndex(_nftKeyIndex);
        delete nftKeyToLendedNftDetails[_nftKey];

        // Remove from app's nft available mapping
        delete nftKeyToNftProps[_nftKey];

        // Remove from user's lended nfts mapping and list
        uint256 _nftKeyUserLendedIndex = _getUserLendedListElementIndex(
            _nftKey,
            user
        );
        _deleteElementAtUserLendedListIndex(_nftKeyUserLendedIndex, user);
        delete user.userLendedNfts[_nftKey];

        // Transfer Nft to lender address
        // nftCollection.safeTransferFrom(address(this), msg.sender, tokenId);

        emit NFTStopLended();
    }

    function _getUserLendedListElementIndex(
        string memory _element,
        User storage user
    ) private view returns (uint256) {
        uint256 len = user.userLendedNftsList.length;
        for (uint256 i = 0; i < len; i++) {
            if (
                keccak256(abi.encodePacked(_element)) ==
                keccak256(abi.encodePacked(user.userLendedNftsList[i]))
            ) {
                return i;
            }
        }
        return len;
    }

    function _deleteElementAtUserLendedListIndex(
        uint256 _index,
        User storage user
    ) private {
        require(
            _index < user.userLendedNftsList.length,
            "Nft key not available in the app renting list"
        );

        uint256 _lastIndex = user.userLendedNftsList.length - 1;
        user.userLendedNftsList[_index] = user.userLendedNftsList[_lastIndex];
        user.userLendedNftsList.pop();
    }

    // Called by lender
    function claimCollateral(string memory _nftKey) external {
        // Msg sender should exists
        User storage lender = addressToUser[msg.sender];
        require(lender.userAddress != address(0), "Lender does not exist");

        nftProps storage nft_ = nftKeyToNftProps[_nftKey];

        // Nft should be available in app
        require(nft_.nftAddress != address(0), "NFT is not available");

        // Nft should be already rented
        lendedNFT storage lendNft_ = nftKeyToLendedNftDetails[_nftKey];
        require(lendNft_.lenderAddress == address(0), "NFT is not rented");

        rentedNFT storage rentNft_ = nftKeyToRentedNftDetails[_nftKey];
        require(rentNft_.borrowerAddress != address(0), "NFT is not rented");

        User storage borrower = addressToUser[rentNft_.borrowerAddress];
        require(borrower.userAddress != address(0), "Borrower does not exist");

        // User should have that nft as lend
        lendedNFT storage userLendNft_ = lender.userLendedNfts[_nftKey];
        require(
            userLendNft_.lenderAddress == msg.sender,
            "User does not have any such NFTs as lend"
        );

        // Time at function call should be greater than end time of rented nft
        uint256 _rentalStartTime = rentNft_.rentalStartTime;
        uint256 _numberOfDays = rentNft_.numberOfDays;
        uint256 _rentalEndTime = _rentalStartTime +
            (uint32(_numberOfDays) * 1 days);
        require(
            _rentalEndTime < block.timestamp,
            "Can't claim collateral till rented end time"
        );

        uint256 collateral = userLendNft_.collateral;

        // Delete mappings

        // Delete nft from app rented Nfts
        delete nftKeyToRentedNftDetails[_nftKey];

        // Delete nft from app
        delete nftKeyToNftProps[_nftKey];

        // Delete nft from lender's lended nfts mapping and list
        uint256 _nftKeyUserLendedIndex = _getUserLendedListElementIndex(
            _nftKey,
            lender
        );
        _deleteElementAtUserLendedListIndex(_nftKeyUserLendedIndex, lender);
        delete lender.userLendedNfts[_nftKey];

        // Delete nft from borrower's rented nfts mapping and list
        uint256 _nftKeyUserRentedIndex = _getUserRentedListElementIndex(
            _nftKey,
            borrower
        );
        _deleteElementAtUserRentedListIndex(_nftKeyUserRentedIndex, borrower);
        delete borrower.userRentedNfts[_nftKey];

        // Pay collateral to lender
        address payable lenderAddress = payable(lender.userAddress);
        lenderAddress.transfer(collateral);

        emit NFTCollateralClaimed();
    }

    function _getUserRentedListElementIndex(
        string memory _element,
        User storage user
    ) private view returns (uint256) {
        uint256 len = user.userRentedNftsList.length;
        for (uint256 i = 0; i < len; i++) {
            if (
                keccak256(abi.encodePacked(_element)) ==
                keccak256(abi.encodePacked(user.userRentedNftsList[i]))
            ) {
                return i;
            }
        }
        return len;
    }

    function _deleteElementAtUserRentedListIndex(
        uint256 _index,
        User storage user
    ) private {
        require(
            _index < user.userRentedNftsList.length,
            "Nft key not available in the app renting list"
        );

        uint256 _lastIndex = user.userRentedNftsList.length - 1;
        user.userRentedNftsList[_index] = user.userRentedNftsList[_lastIndex];
        user.userRentedNftsList.pop();
    }

    // Called by borrower
    function returnNFT(string memory _nftKey) external {
        _returnNFTChecks(_nftKey);

        User storage borrower = addressToUser[msg.sender];
        rentedNFT storage rentNft_ = nftKeyToRentedNftDetails[_nftKey];
        User storage lender = addressToUser[rentNft_.lenderAddress];

        //nftProps storage nft_ = nftKeyToNftProps[_nftKey];
        //uint tokenId = nft_.nftId;

        lendedNFT storage userLendNft_ = lender.userLendedNfts[_nftKey];
        uint256 collateral = userLendNft_.collateral;

        address lenderAddress = lender.userAddress;
        address payable borrowerAddress = payable(borrower.userAddress);

        // Delete and update mappings

        // remove nft from app rented nfts
        delete nftKeyToRentedNftDetails[_nftKey];

        // remove nft from borrower rented nfts
        uint256 _nftKeyUserRentedIndex = _getUserRentedListElementIndex(
            _nftKey,
            borrower
        );
        _deleteElementAtUserRentedListIndex(_nftKeyUserRentedIndex, borrower);
        delete borrower.userRentedNfts[_nftKey];

        uint32 dueDate = userLendNft_.dueDate;

        // before due date has passed
        if (block.timestamp < dueDate) {
            // set borrower address lender lended nfts to address 0
            userLendNft_.borrowerAddress = address(0);

            // Add nft in app lended NFT - Nft again for lend
            lendedNFT memory newNft = lendedNFT(
                _nftKey,
                lenderAddress,
                address(0),
                dueDate,
                userLendNft_.dailyRent,
                collateral
            );
            nftKeyToLendedNftDetails[_nftKey] = newNft;
            nftKeysListAvaiableForRent.push(_nftKey);

            // Transfer NFT to contract - Contract should be approved first
            // ERC721 nftCollection = ERC721(nft_.nftAddress);
            // nftCollection.safeTransferFrom(borrowerAddress,address(this),tokenId);
        }
        // after due date has passed
        else {
            // Delete nft from lender's lended nfts mapping and list
            uint256 _nftKeyUserLendedIndex = _getUserLendedListElementIndex(
                _nftKey,
                lender
            );
            _deleteElementAtUserLendedListIndex(_nftKeyUserLendedIndex, lender);
            delete lender.userLendedNfts[_nftKey];

            // Delete nft from app
            delete nftKeyToNftProps[_nftKey];

            // Transfer NFT to lender - Contract should be approved first
            // ERC721 nftCollection = ERC721(nft_.nftAddress);
            // nftCollection.safeTransferFrom(borrowerAddress,lenderAddress,tokenId);
        }

        // Transfer collateral to borrower
        borrowerAddress.transfer(collateral);

        emit NFTReturned();
    }

    function _returnNFTChecks(string memory _nftKey) private view {
        // Msg sender should exists
        User storage borrower = addressToUser[msg.sender];
        require(borrower.userAddress != address(0), "User does not exists");

        nftProps storage nft_ = nftKeyToNftProps[_nftKey];

        // Nft should be available in app
        require(nft_.nftAddress != address(0), "NFT is not available");

        // Nft should be already rented
        lendedNFT storage lendNft_ = nftKeyToLendedNftDetails[_nftKey];
        require(lendNft_.lenderAddress == address(0), "NFT is not rented");

        rentedNFT storage rentNft_ = nftKeyToRentedNftDetails[_nftKey];
        require(rentNft_.borrowerAddress != address(0), "NFT is not rented");

        User storage lender = addressToUser[rentNft_.lenderAddress];
        require(lender.userAddress != address(0), "Lender does not exist");

        // User should have that nft as rent
        rentedNFT storage userRentNft_ = borrower.userRentedNfts[_nftKey];
        require(
            userRentNft_.borrowerAddress == msg.sender,
            "User does not have any such NFTs as rent"
        );
    }
}
