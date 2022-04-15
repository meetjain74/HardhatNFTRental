const { expect } = require('chai');
const { ethers } = require('hardhat');

const { nftAddress, nftId, nftKey, nftOwner, nftName, nftImageURL } = require('./nftData.json');

describe("NFT Rental contract", () => {
    let owner,contract;
    let addr1,addr2,addr3;

    beforeEach(async () => {
        // Create the smart contract object to test from
        [owner,addr1,addr2,addr3] = await ethers.getSigners();
        // console.log(owner.address);
        // console.log(addr1.address);
        const NFTRentalContract = await ethers.getContractFactory("NFTRental");
        contract = await NFTRentalContract.deploy();
    });

    describe("Add user", () => {

        it("Any other user can't add your address to app",async () => {
            await expect(contract.addUser(addr1.address))
            .to.be.revertedWith("Only the user can add his account to app");
        });

        it("Should add user to the users list",async () => {
            await contract.connect(addr1).addUser(addr1.address);
            const userAddressList = await contract.getUserAddressList();
            expect(userAddressList[0]).to.equal(addr1.address);
    
            const user = await contract.connect(addr1).addressToUser(addr1.address);
            expect(user).to.equal(addr1.address);
            // expect(user.userAddress).to.equal(addr1.address);
            // expect(user.userLendedNftsSize).to.equal(0);
            // expect(user.userRentedNftsSize).to.equal(0);
            // expect(user.userWishlistSize).to.equal(0);
        });
    });
    
    describe("Contract Getters", () => {
        
        describe("Getter for User NFT Lended Details", () => {
            let _userAddress;
            let _nftKey;
            // let _index;

            beforeEach(async () => {
                _userAddress = addr1.address;
                _nftKey = nftKey;
                // _index = 0;
            });

            it("User should exist for able to fetch his/her lended NFT details",async () => {
                await expect(contract.connect(addr1).getUserLendedNFTDetails(
                    _userAddress,_nftKey
                ))
                .to.be.revertedWith("User does not exists");
            });

            // it("Index of NFT to be fetched should exist",async () => {
            //     await contract.connect(addr1).addUser(_userAddress);
            //     await expect(contract.connect(addr1).getUserLendedNFTDetails(
            //         _userAddress,_index
            //     ))
            //     .to.be.revertedWith("Nft at the given index does not exist");
            // });

            it("User should have the lended Nft with the key",async () => {
                await contract.connect(addr1).addUser(_userAddress);
                await expect(contract.connect(addr1).getUserLendedNFTDetails(
                    _userAddress,_nftKey
                ))
                .to.be.revertedWith("User does not have any such lended Nft");
            });
        });

        describe("Getter for User NFT Rented Details", () => {
            let _userAddress;
            let _nftKey;

            beforeEach(async () => {
                _userAddress = addr1.address;
                _nftKey = nftKey;
                // _index = 0;
            });

            it("User should exist for able to fetch his/her rented NFT details",async () => {
                await expect(contract.connect(addr1).getUserRentedNFTDetails(
                    _userAddress,_nftKey
                ))
                .to.be.revertedWith("User does not exists");
            });

            it("User should have the rented Nft with the key",async () => {
                await contract.connect(addr1).addUser(_userAddress);
                await expect(contract.connect(addr1).getUserRentedNFTDetails(
                    _userAddress,_nftKey
                ))
                .to.be.revertedWith("User does not have any such rented Nft");
            });
        });
    });

    describe("Lending", () => {
        let _nftKey,_nftOwner,_nftAddress,_nftId,_wishlistCount,_nftName;
        let _nftImageURL,_lenderAddress,_dueDate,_dailyRent,_collateral;

        beforeEach(async () => {
            _nftKey = nftKey;
            _nftOwner = addr1.address; // To be changed 
            const nftWallet = new ethers.Wallet(nftAddress);
            _nftAddress = nftWallet.address;
            _nftId = parseInt(nftId);
            _wishlistCount = 0;
            _nftName = nftName;
            _nftImageURL = nftImageURL;
            _lenderAddress = addr1.address;
            _dueDate = 4294967295; // In Unix epoch (9 August 2022)
            _dailyRent = 1000000;
            _collateral = 10000000000000;
        });

        it("Should not lend anyone else's NFT",async ()=> {
            await expect(contract.addNFTToLend(
                _nftKey,_nftOwner,_nftAddress,_nftId,_wishlistCount,_nftName,
                _nftImageURL,_lenderAddress,_dueDate,_dailyRent,_collateral
            ))
            .to.be.revertedWith("Can't lend someone else's NFT");
        });

        it("Lender address/NFT Owner should exist",async () => {
            await expect(contract.connect(addr1).addNFTToLend(
                _nftKey,_nftOwner,_nftAddress,_nftId,_wishlistCount,_nftName,
                _nftImageURL,_lenderAddress,_dueDate,_dailyRent,_collateral
            ))
            .to.be.revertedWith("User does not exist");
        });

        it("NFT should not be rented again",async () => {
            await contract.connect(addr1).addUser(_lenderAddress);
            const response = await contract.connect(addr1).addNFTToLend(
                _nftKey,_nftOwner,_nftAddress,_nftId,_wishlistCount,_nftName,
                _nftImageURL,_lenderAddress,_dueDate,_dailyRent,_collateral
            );

            // Calling same function twice - for nft to be available for renting again
            await expect(contract.connect(addr1).addNFTToLend(
                _nftKey,_nftOwner,_nftAddress,_nftId,_wishlistCount,_nftName,
                _nftImageURL,_lenderAddress,_dueDate,_dailyRent,_collateral
            ))
            .to.be.revertedWith("NFT is already available for renting");
       });

       it("Wrong NFT owner should not able to lend NFT",async () => {
           _lenderAddress = addr2.address;
           await contract.connect(addr2).addUser(_lenderAddress);
           await expect(contract.connect(addr2).addNFTToLend(
                _nftKey,_nftOwner,_nftAddress,_nftId,_wishlistCount,_nftName,
                _nftImageURL,_lenderAddress,_dueDate,_dailyRent,_collateral
           ))
           .to.be.revertedWith("Non NFT Owner");
       });

       it("Due date smaller than today should not be accepted",async () => {
           await contract.connect(addr1).addUser(_lenderAddress);
           _dueDate = 1649500514;
           await expect(contract.connect(addr1).addNFTToLend(
                _nftKey,_nftOwner,_nftAddress,_nftId,_wishlistCount,_nftName,
                _nftImageURL,_lenderAddress,_dueDate,_dailyRent,_collateral
           ))
           .to.be.revertedWith("Bad time bounds");
       });

       it("Wishlist count for new NFT made available for renting should be 0",async () => {
            await contract.connect(addr1).addUser(_lenderAddress);
            _wishlistCount = 5;
            await expect(contract.connect(addr1).addNFTToLend(
                _nftKey,_nftOwner,_nftAddress,_nftId,_wishlistCount,_nftName,
                _nftImageURL,_lenderAddress,_dueDate,_dailyRent,_collateral
            ))
            .to.be.revertedWith("New NFT can't be in any users wishlist yet");
       });

       it("Should make NFT available for renting",async () => {
           await contract.connect(addr1).addUser(_lenderAddress);
           await contract.connect(addr1).addNFTToLend(
                _nftKey,_nftOwner,_nftAddress,_nftId,_wishlistCount,_nftName,
                _nftImageURL,_lenderAddress,_dueDate,_dailyRent,_collateral
           );

           const nftKeysListAvaiableForRent = await contract.connect(addr1).getNftKeysListAvaiableForRent();
           expect(nftKeysListAvaiableForRent[0]).to.equal(_nftKey);

           // Check mapping nftKeyToNftProps
           const nft = await contract.connect(addr1).nftKeyToNftProps(_nftKey);
           expect(nft.nftKey).to.equal(_nftKey);
           expect(nft.nftOwner).to.equal(_nftOwner);
           expect(nft.nftAddress).to.equal(_nftAddress);
           expect(nft.wishlistCount).to.equal(_wishlistCount);
           expect(nft.nftName).to.equal(_nftName);
           expect(nft.nftImageURL).to.equal(_nftImageURL);

           // Get user from address
           const user = await contract.connect(addr1).addressToUser(_lenderAddress);
           expect(user).to.equal(_lenderAddress);
        //    expect(user.userAddress).to.equal(_lenderAddress);
        //    expect(user.userLendedNftsSize).to.equal(1);
        //    expect(user.userRentedNftsSize).to.equal(0);
        //    expect(user.userWishlistSize).to.equal(0);

           const lendedNftDetails = await contract.connect(addr1).getUserLendedNFTDetails(_lenderAddress,_nftKey);
           expect(lendedNftDetails.nftKey).to.equal(_nftKey);
           expect(lendedNftDetails.lenderAddress).to.equal(_lenderAddress);
           expect(lendedNftDetails.borrowerAddress).to.equal("0x0000000000000000000000000000000000000000");
           expect(lendedNftDetails.dueDate).to.equal(_dueDate);
           expect(lendedNftDetails.dailyRent).to.equal(_dailyRent);
           expect(lendedNftDetails.collateral).to.equal(_collateral);

           // Check mapping nftKeyToLendedNftDetails
           const lendedNft = await contract.connect(addr1).nftKeyToLendedNftDetails(_nftKey);
           expect(lendedNft.nftKey).to.equal(_nftKey);
           expect(lendedNft.lenderAddress).to.equal(_lenderAddress);
           expect(lendedNft.borrowerAddress).to.equal("0x0000000000000000000000000000000000000000");
           expect(lendedNft.dueDate).to.equal(_dueDate);
           expect(lendedNft.dailyRent).to.equal(_dailyRent);
           expect(lendedNft.collateral).to.equal(_collateral);
       });
    });

    describe("Renting", () => {
        let _nftKey,_borrowerAddress,_numberOfDays,_rentalStartTime;
        // For renting, nft should be lended first
        let _nftOwner,_nftAddress,_nftId,_wishlistCount,_nftName;
        let _nftImageURL,_lenderAddress,_dueDate,_dailyRent,_collateral;
        let val;

        beforeEach(async () => {
            _nftKey = nftKey;
            _borrowerAddress = addr1.address;
            _numberOfDays = 5;
            _rentalStartTime = 1649500514; // in unix epoch

            _nftOwner = addr1.address; // To be changed
            const nftWallet = new ethers.Wallet(nftAddress);
            _nftAddress = nftWallet.address;
            _nftId = parseInt(nftId);
            _wishlistCount = 0;
            _nftName = nftName;
            _nftImageURL = nftImageURL;
            _lenderAddress = addr1.address;
            _dueDate = 4294967295; // In Unix epoch
            _dailyRent = 1000000;
            _collateral = 10000000000000;

            val = _dailyRent*_numberOfDays + _collateral;
        });

        it("Should not rent Nft for someone else",async () => {
            await expect(contract.rentNft(
                _nftKey,_borrowerAddress,_numberOfDays,_rentalStartTime
            ))
            .to.be.revertedWith("Can't borrow NFT for another borrower address");
        });

        it("Renter address should exist",async () => {
            await expect(contract.connect(addr1).rentNft(
                _nftKey,_borrowerAddress,_numberOfDays,_rentalStartTime
            ))
            .to.be.revertedWith("User does not exist");
        });

        it("NFT should be available for renting",async () => {
            await contract.connect(addr1).addUser(_borrowerAddress);
            await expect(contract.connect(addr1).rentNft(
                _nftKey,_borrowerAddress,_numberOfDays,_rentalStartTime
            ))
            .to.be.revertedWith("NFT is not available for renting");
        });
        
        it("Rental start time should be less than current time",async () => {
            _rentalStartTime = 4294967295;

            // Address 1 puts NFT to rent
            await contract.connect(addr1).addUser(_borrowerAddress);
            await contract.connect(addr1).addNFTToLend(
                _nftKey,_nftOwner,_nftAddress,_nftId,_wishlistCount,_nftName,
                _nftImageURL,_lenderAddress,_dueDate,_dailyRent,_collateral
            );
            
            // Address 2 rents the NFT
            _borrowerAddress = addr2.address;
            await contract.connect(addr2).addUser(_borrowerAddress);
            await expect(contract.connect(addr2).rentNft(
                _nftKey,_borrowerAddress,_numberOfDays,_rentalStartTime
            ))
            .to.be.revertedWith("Bad time bounds");
        });

        it("Should not rent Nft for more number of days than the number of days available for renting",async () => {
            _numberOfDays = 3000;
            _dueDate = 1908680722; // 26 June 2030

            // Address 1 puts NFT to rent
            await contract.connect(addr1).addUser(_borrowerAddress);
            await contract.connect(addr1).addNFTToLend(
                _nftKey,_nftOwner,_nftAddress,_nftId,_wishlistCount,_nftName,
                _nftImageURL,_lenderAddress,_dueDate,_dailyRent,_collateral
            );
            
            // Address 2 rents the NFT
            _borrowerAddress = addr2.address;
            await contract.connect(addr2).addUser(_borrowerAddress);
            await expect(contract.connect(addr2).rentNft(
                _nftKey,_borrowerAddress,_numberOfDays,_rentalStartTime
            ))
            .to.be.revertedWith("Can't rent NFT for more than amount of time available for renting");
        });

        it("Should not send ether less than payment",async () => {
            val = val-10000; // Send less

            // Address 1 puts NFT to rent
            await contract.connect(addr1).addUser(_borrowerAddress);
            await contract.connect(addr1).addNFTToLend(
                _nftKey,_nftOwner,_nftAddress,_nftId,_wishlistCount,_nftName,
                _nftImageURL,_lenderAddress,_dueDate,_dailyRent,_collateral
            );

            // Address 2 rents the NFT
            _borrowerAddress = addr2.address;
            await contract.connect(addr2).addUser(_borrowerAddress);
            await expect(contract.connect(addr2).rentNft(
                _nftKey,_borrowerAddress,_numberOfDays,_rentalStartTime,
                {value: val}
            ))
            .to.be.revertedWith("Can't rent NFT as insufficient amount paid");
        });
        
        it("Borrower address should not be equal to lender address",async () => {
            // Address 1 puts NFT to rent
            await contract.connect(addr1).addUser(_borrowerAddress);
            await contract.connect(addr1).addNFTToLend(
                _nftKey,_nftOwner,_nftAddress,_nftId,_wishlistCount,_nftName,
                _nftImageURL,_lenderAddress,_dueDate,_dailyRent,_collateral
            );

            // Address 1 rents the NFT
            await expect(contract.connect(addr1).rentNft(
                _nftKey,_borrowerAddress,_numberOfDays,_rentalStartTime,
                {value: val}
            ))
            .to.be.revertedWith("Borrower address can't be the same as lender address");
        });

        it("Nft should be rented if all parameters passed correctly",async () => {
            // Address 1 puts NFT to rent
            await contract.connect(addr1).addUser(_borrowerAddress);
            await contract.connect(addr1).addNFTToLend(
                _nftKey,_nftOwner,_nftAddress,_nftId,_wishlistCount,_nftName,
                _nftImageURL,_lenderAddress,_dueDate,_dailyRent,_collateral
            );

            const lendedNft = await contract.connect(addr2).nftKeyToLendedNftDetails(_nftKey);
            const lenderAddress = lendedNft.lenderAddress;

            // Address 2 rents the NFT
            _borrowerAddress = addr2.address;
            await contract.connect(addr2).addUser(_borrowerAddress);
            await contract.connect(addr2).rentNft(
                _nftKey,_borrowerAddress,_numberOfDays,_rentalStartTime,
                {value: val}
            );

            const nft_ = await contract.connect(addr2).getUserLendedNFTDetails(lenderAddress,_nftKey);
            expect(nft_.borrowerAddress).to.equal(_borrowerAddress);
            
            const rentedNft = await contract.connect(addr2).getUserRentedNFTDetails(_borrowerAddress,_nftKey);
            expect(rentedNft.nftKey).to.equal(_nftKey);
            expect(rentedNft.lenderAddress).to.equal(lenderAddress);
            expect(rentedNft.borrowerAddress).to.equal(_borrowerAddress);
            expect(rentedNft.numberOfDays).to.equal(_numberOfDays);
            expect(rentedNft.rentalStartTime).to.equal(_rentalStartTime);

            const rentedNft_ = await contract.connect(addr2).nftKeyToRentedNftDetails(_nftKey);
            expect(rentedNft_.nftKey).to.equal(_nftKey);
            expect(rentedNft_.lenderAddress).to.equal(lenderAddress);
            expect(rentedNft_.borrowerAddress).to.equal(_borrowerAddress);
            expect(rentedNft_.numberOfDays).to.equal(_numberOfDays);
            expect(rentedNft_.rentalStartTime).to.equal(_rentalStartTime);
            
            const lendedNft_ = await contract.connect(addr2).nftKeyToLendedNftDetails(_nftKey);
            expect(lendedNft_.nftKey).to.equal("");
            expect(lendedNft_.lenderAddress).to.equal("0x0000000000000000000000000000000000000000");
            expect(lendedNft_.borrowerAddress).to.equal("0x0000000000000000000000000000000000000000");
            expect(lendedNft_.dueDate).to.equal(0);
            expect(lendedNft_.dailyRent).to.equal(0);
            expect(lendedNft_.collateral).to.equal(0);
        });

        // Test when more ether is spent on rent transaction 
    });

    // it ("Address in string check1", async () => {
    //     const addr = '0xcd3b766ccdd6ae721141f452c550ca635964ce71';
    //     console.log(addr);
    //     await contract.addUser(addr);
    //     const userAddressList = await contract.getUserAddressList();
    //     expect(userAddressList[0]).to.equal(addr);
    //     // Successfully passes address to solidity but gives assertion error (due to checksum error)
    // });

    // it ("Address in string check2", async () => {
    //     const Web3 = require('web3');
    //     const web3 = new Web3(Web3.givenProvider);
    //     const addr = Web3.utils.toChecksumAddress('0xcd3b766ccdd6ae721141f452c550ca635964ce71');
    //     await contract.addUser(addr);
    //     const userAddressList = await contract.getUserAddressList();
    //     expect(userAddressList[0]).to.equal(addr);
    // });

    // it ("Address in string check3", async () => {
    //     const addrWallet = new ethers.Wallet('0xcd3b766ccdd6ae721141f452c550ca635964ce71');
    //     await contract.addUser(addrWallet.address);
    //     const userAddressList = await contract.getUserAddressList();
    //     expect(userAddressList[0]).to.equal(addrWallet.address);
    // });
});