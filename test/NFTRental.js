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

            // it("User should have the lended Nft with the key",async () => {
            //     await contract.connect(addr1).addUser(_userAddress);
            //     await expect(contract.connect(addr1).getUserLendedNFTDetails(
            //         _userAddress,_nftKey
            //     ))
            //     .to.be.revertedWith("User does not have any such lended Nft");
            // });
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

            // it("User should have the rented Nft with the key",async () => {
            //     await contract.connect(addr1).addUser(_userAddress);
            //     await expect(contract.connect(addr1).getUserRentedNFTDetails(
            //         _userAddress,_nftKey
            //     ))
            //     .to.be.revertedWith("User does not have any such rented Nft");
            // });
        });
    });

    describe("Lending", () => {
        let _nftKey,_nftOwner,_nftAddress,_nftId,_nftName;
        let _nftImageURL,_lenderAddress,_dueDate,_dailyRent,_collateral;

        beforeEach(async () => {
            _nftKey = nftKey;
            _nftOwner = addr1.address; // To be changed 
            const nftWallet = new ethers.Wallet(nftAddress);
            _nftAddress = nftWallet.address;
            _nftId = parseInt(nftId);
            _nftName = nftName;
            _nftImageURL = nftImageURL;
            _lenderAddress = addr1.address;
            _dueDate = 4294967295; // In Unix epoch (9 August 2022)
            _dailyRent = 1000000;
            _collateral = 10000000000000;
        });

        it("Should not lend anyone else's NFT",async ()=> {
            await expect(contract.addNFTToLend(
                _nftKey,_nftOwner,_nftAddress,_nftId,_nftName,
                _nftImageURL,_lenderAddress,_dueDate,_dailyRent,_collateral
            ))
            .to.be.revertedWith("Can't lend someone else's NFT");
        });

        it("Lender address/NFT Owner should exist",async () => {
            await expect(contract.connect(addr1).addNFTToLend(
                _nftKey,_nftOwner,_nftAddress,_nftId,_nftName,
                _nftImageURL,_lenderAddress,_dueDate,_dailyRent,_collateral
            ))
            .to.be.revertedWith("User does not exist");
        });

        it("NFT should not be lended again",async () => {
            await contract.connect(addr1).addUser(_lenderAddress);
            const response = await contract.connect(addr1).addNFTToLend(
                _nftKey,_nftOwner,_nftAddress,_nftId,_nftName,
                _nftImageURL,_lenderAddress,_dueDate,_dailyRent,_collateral
            );

            // Calling same function twice - for nft to be available for renting again
            await expect(contract.connect(addr1).addNFTToLend(
                _nftKey,_nftOwner,_nftAddress,_nftId,_nftName,
                _nftImageURL,_lenderAddress,_dueDate,_dailyRent,_collateral
            ))
            .to.be.revertedWith("NFT is already available for renting");
       });

       it("Wrong NFT owner should not able to lend NFT",async () => {
           _lenderAddress = addr2.address;
           await contract.connect(addr2).addUser(_lenderAddress);
           await expect(contract.connect(addr2).addNFTToLend(
                _nftKey,_nftOwner,_nftAddress,_nftId,_nftName,
                _nftImageURL,_lenderAddress,_dueDate,_dailyRent,_collateral
           ))
           .to.be.revertedWith("Non NFT Owner");
       });

       it("Due date smaller than today should not be accepted",async () => {
           await contract.connect(addr1).addUser(_lenderAddress);
           _dueDate = 1649500514;
           await expect(contract.connect(addr1).addNFTToLend(
                _nftKey,_nftOwner,_nftAddress,_nftId,_nftName,
                _nftImageURL,_lenderAddress,_dueDate,_dailyRent,_collateral
           ))
           .to.be.revertedWith("Bad time bounds");
       });

       it("Should make NFT available for renting",async () => {
           await contract.connect(addr1).addUser(_lenderAddress);
           await contract.connect(addr1).addNFTToLend(
                _nftKey,_nftOwner,_nftAddress,_nftId,_nftName,
                _nftImageURL,_lenderAddress,_dueDate,_dailyRent,_collateral
           );

           const nftKeysListAvaiableForRent = await contract.connect(addr1).getNftKeysListAvaiableForRent();
           expect(nftKeysListAvaiableForRent[0]).to.equal(_nftKey);

           // Check mapping nftKeyToNftProps
           const nft = await contract.connect(addr1).nftKeyToNftProps(_nftKey);
           expect(nft.nftKey).to.equal(_nftKey);
           expect(nft.nftOwner).to.equal(_nftOwner);
           expect(nft.nftAddress).to.equal(_nftAddress);
           expect(nft.nftName).to.equal(_nftName);
           expect(nft.nftImageURL).to.equal(_nftImageURL);

           // Get user from address
           const user = await contract.connect(addr1).addressToUser(_lenderAddress);
           expect(user).to.equal(_lenderAddress);
           
        //    expect(user.userAddress).to.equal(_lenderAddress);
        //    expect(user.userLendedNftsSize).to.equal(1);
        //    expect(user.userRentedNftsSize).to.equal(0);
        //    expect(user.userWishlistSize).to.equal(0);

           const lendedNftKey = await contract.connect(addr1).getUserLendedNFTListDetails(_lenderAddress,0);
           expect(lendedNftKey).to.equal(nftKey);

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
        let _nftOwner,_nftAddress,_nftId,_nftName;
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
                _nftKey,_nftOwner,_nftAddress,_nftId,_nftName,
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
                _nftKey,_nftOwner,_nftAddress,_nftId,_nftName,
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
                _nftKey,_nftOwner,_nftAddress,_nftId,_nftName,
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
                _nftKey,_nftOwner,_nftAddress,_nftId,_nftName,
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
                _nftKey,_nftOwner,_nftAddress,_nftId,_nftName,
                _nftImageURL,_lenderAddress,_dueDate,_dailyRent,_collateral
            );

            const lendedNft = await contract.connect(addr2).nftKeyToLendedNftDetails(_nftKey);
            const lenderAddress = lendedNft.lenderAddress;

            const initContractBalance = await contract.getContractBalance();
            const initBalance = await addr1.getBalance();

            // Address 2 rents the NFT
            _borrowerAddress = addr2.address;
            await contract.connect(addr2).addUser(_borrowerAddress);
            await contract.connect(addr2).rentNft(
                _nftKey,_borrowerAddress,_numberOfDays,_rentalStartTime,
                {value: val}
            );

            const finalBalance = await addr1.getBalance();
            const diff = finalBalance.sub(initBalance);
            const rent = _dailyRent * _numberOfDays;
            expect(diff).to.equal(rent);

            const nft_ = await contract.connect(addr2).getUserLendedNFTDetails(lenderAddress,_nftKey);
            expect(nft_.borrowerAddress).to.equal(_borrowerAddress);

            const rentedNftKey = await contract.connect(addr2).getUserRentedNFTListDetails(_borrowerAddress,0);
            expect(rentedNftKey).to.equal(nftKey);
            
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

            const finalContractBalance = await contract.getContractBalance();
            expect(finalContractBalance-initContractBalance).to.equal(_collateral);
        });
    });

    describe("Stop Lending", () => {
        let _nftKey;
        let _nftOwner,_nftAddress,_nftId,_nftName;
        let _nftImageURL,_lenderAddress,_dueDate,_dailyRent,_collateral;
        let _borrowerAddress,_numberOfDays,_rentalStartTime;
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
            _nftName = nftName;
            _nftImageURL = nftImageURL;
            _lenderAddress = addr1.address;
            _dueDate = 4294967295; // In Unix epoch
            _dailyRent = 1000000;
            _collateral = 10000000000000;

            val = _dailyRent*_numberOfDays + _collateral;
        });

        it("User should exist",async () => {
            await expect(contract.connect(addr1).stopLend(_nftKey))
            .to.be.revertedWith("User does not exists");
        });

        it("NFT should be available in app",async () => {
            await contract.connect(addr1).addUser(addr1.address);
            await expect(contract.connect(addr1).stopLend(_nftKey))
            .to.be.revertedWith("NFT is not available");
        });

        it("Nft should not be already rented",async () => {
            await contract.connect(addr1).addUser(addr1.address);
            await contract.connect(addr1).addNFTToLend(
                _nftKey,_nftOwner,_nftAddress,_nftId,_nftName,
                _nftImageURL,_lenderAddress,_dueDate,_dailyRent,_collateral
            );

            // Address 2 rents the NFT
            _borrowerAddress = addr2.address;
            await contract.connect(addr2).addUser(_borrowerAddress);
            await contract.connect(addr2).rentNft(
                _nftKey,_borrowerAddress,_numberOfDays,_rentalStartTime,
                {value: val}
            );

            // Address 1 tries to stop lending
            await expect(contract.connect(addr1).stopLend(_nftKey))
            .to.be.revertedWith("NFT is already rented");
        });

        it("Should not stop lend someone else's NFT",async () => {
            await contract.connect(addr1).addUser(addr1.address);
            await contract.connect(addr1).addNFTToLend(
                _nftKey,_nftOwner,_nftAddress,_nftId,_nftName,
                _nftImageURL,_lenderAddress,_dueDate,_dailyRent,_collateral
            );

            await contract.connect(addr2).addUser(addr2.address);
            await expect(contract.connect(addr2).stopLend(_nftKey))
            .to.be.revertedWith("Can't stop lend someone else's NFT");
        });

        it("Should stop lend if everything else works fine",async() => {
            await contract.connect(addr1).addUser(addr1.address);
            await contract.connect(addr1).addNFTToLend(
                _nftKey,_nftOwner,_nftAddress,_nftId,_nftName,
                _nftImageURL,_lenderAddress,_dueDate,_dailyRent,_collateral
            );

            await contract.connect(addr1).stopLend(_nftKey);

            const lendedNft_ = await contract.connect(addr1).nftKeyToLendedNftDetails(_nftKey);
            expect(lendedNft_.nftKey).to.equal("");
            expect(lendedNft_.lenderAddress).to.equal("0x0000000000000000000000000000000000000000");
            expect(lendedNft_.borrowerAddress).to.equal("0x0000000000000000000000000000000000000000");
            expect(lendedNft_.dueDate).to.equal(0);
            expect(lendedNft_.dailyRent).to.equal(0);
            expect(lendedNft_.collateral).to.equal(0);

            const nftProps_ = await contract.connect(addr1).nftKeyToNftProps(_nftKey);
            expect(nftProps_.nftKey).to.equal("");
            expect(nftProps_.nftOwner).to.equal("0x0000000000000000000000000000000000000000");
            expect(nftProps_.nftAddress).to.equal("0x0000000000000000000000000000000000000000");
            expect(nftProps_.nftId).to.equal(0);
            expect(nftProps_.nftName).to.equal("");
            expect(nftProps_.nftImageURL).to.equal("");

            const user = await contract.connect(addr1).addressToUser(addr1.address);

            await expect(contract.connect(addr1).getUserLendedNFTDetails(addr1.address,_nftKey))
            .to.be.revertedWith("User does not have any such lended Nft");

            await expect(contract.connect(addr1).getUserLendedNFTListDetails(addr1.address,0))
            .to.be.revertedWith("Nft at the given index does not exist");
            
        });
    });

    describe("Claim collateral", () => {
        let _nftKey;
        let _nftOwner,_nftAddress,_nftId,_nftName;
        let _nftImageURL,_lenderAddress,_dueDate,_dailyRent,_collateral;
        let _borrowerAddress,_numberOfDays,_rentalStartTime;
        let val;

        beforeEach(async () => {
            _nftKey = nftKey;
            _borrowerAddress = addr1.address;
            _numberOfDays = 5;
            _rentalStartTime = 1649500514; // in unix epoch -> 9 April 2022

            _nftOwner = addr1.address; // To be changed
            const nftWallet = new ethers.Wallet(nftAddress);
            _nftAddress = nftWallet.address;
            _nftId = parseInt(nftId);
            _nftName = nftName;
            _nftImageURL = nftImageURL;
            _lenderAddress = addr1.address;
            _dueDate = 4294967295; // In Unix epoch
            _dailyRent = 1000000;
            _collateral = 10000000000000;

            val = _dailyRent*_numberOfDays + _collateral;
        });

        it("Does lender exists",async () => {
            await expect(contract.connect(addr1).claimCollateral(_nftKey))
            .to.be.revertedWith("Lender does not exist");
        });

        it("Does Nft exists",async () => {
            await contract.connect(addr1).addUser(addr1.address);
            await expect(contract.connect(addr1).claimCollateral(_nftKey))
            .to.be.revertedWith("NFT is not available");
        });

        it("Is Nft rented",async () => {
            await contract.connect(addr1).addUser(addr1.address);
            await contract.connect(addr1).addNFTToLend(
                _nftKey,_nftOwner,_nftAddress,_nftId,_nftName,
                _nftImageURL,_lenderAddress,_dueDate,_dailyRent,_collateral
            );

            await expect(contract.connect(addr1).claimCollateral(_nftKey))
            .to.be.revertedWith("NFT is not rented");
        });

        it("Should not claim collateral before rental end time",async () => {
            await contract.connect(addr1).addUser(addr1.address);
            await contract.connect(addr1).addNFTToLend(
                _nftKey,_nftOwner,_nftAddress,_nftId,_nftName,
                _nftImageURL,_lenderAddress,_dueDate,_dailyRent,_collateral
            );

            // Address 2 rents the NFT
            _numberOfDays = 1000;
            val = _dailyRent*_numberOfDays + _collateral;
            _borrowerAddress = addr2.address;
            await contract.connect(addr2).addUser(_borrowerAddress);
            await contract.connect(addr2).rentNft(
                _nftKey,_borrowerAddress,_numberOfDays,_rentalStartTime,
                {value: val}
            );

            await expect(contract.connect(addr1).claimCollateral(_nftKey))
            .to.be.revertedWith("Can't claim collateral till rented end time");
        });

        it("Should claim collateral if everything works fine",async () => {
            await contract.connect(addr1).addUser(addr1.address);
            await contract.connect(addr1).addNFTToLend(
                _nftKey,_nftOwner,_nftAddress,_nftId,_nftName,
                _nftImageURL,_lenderAddress,_dueDate,_dailyRent,_collateral
            );

            // Address 2 rents the NFT
            _numberOfDays = 5;
            val = _dailyRent*_numberOfDays + _collateral;
            _borrowerAddress = addr2.address;
            await contract.connect(addr2).addUser(_borrowerAddress);
            await contract.connect(addr2).rentNft(
                _nftKey,_borrowerAddress,_numberOfDays,_rentalStartTime,
                {value: val}
            );

            const initBalance = await addr1.getBalance();

            const res = await contract.connect(addr1).claimCollateral(_nftKey);
            const receipt = await res.wait();
            const gas = receipt.gasUsed.mul(receipt.effectiveGasPrice);

            const finalBalance = await addr1.getBalance();
            const diff = (finalBalance.sub(initBalance)).add(gas);
            expect(diff).to.equal(_collateral);

            const rentednft = await contract.connect(addr2).nftKeyToRentedNftDetails(_nftKey);
            expect(rentednft.nftKey).to.equal("");
            expect(rentednft.lenderAddress).to.equal("0x0000000000000000000000000000000000000000");
            expect(rentednft.borrowerAddress).to.equal("0x0000000000000000000000000000000000000000");
            expect(rentednft.numberOfDays).to.equal(0);
            expect(rentednft.rentalStartTime).to.equal(0);

            const nft = await contract.connect(addr2).nftKeyToNftProps(_nftKey);
            expect(nft.nftKey).to.equal("");
            expect(nft.nftId).to.equal(0);
            expect(nft.nftOwner).to.equal("0x0000000000000000000000000000000000000000");
            expect(nft.nftAddress).to.equal("0x0000000000000000000000000000000000000000");
            expect(nft.nftName).to.equal("");
            expect(nft.nftImageURL).to.equal("");

            await expect(contract.connect(addr1).getUserLendedNFTDetails(_lenderAddress,_nftKey))
            .to.be.revertedWith("User does not have any such lended Nft");

            await expect(contract.connect(addr1).getUserLendedNFTListDetails(_lenderAddress,0))
            .to.be.revertedWith("Nft at the given index does not exist");

            await expect(contract.connect(addr2).getUserRentedNFTDetails(_borrowerAddress,_nftKey))
            .to.be.revertedWith("User does not have any such rented Nft");

            await expect(contract.connect(addr2).getUserRentedNFTListDetails(_borrowerAddress,0))
            .to.be.revertedWith("Nft at the given index does not exist");
        });
    });

    describe("Return NFT", () => {
        let _nftKey;
        let _nftOwner,_nftAddress,_nftId,_nftName;
        let _nftImageURL,_lenderAddress,_dueDate,_dailyRent,_collateral;
        let _borrowerAddress,_numberOfDays,_rentalStartTime;
        let val;

        beforeEach(async () => {
            _nftKey = nftKey;
            _borrowerAddress = addr1.address;
            _numberOfDays = 5;
            _rentalStartTime = 1649500514; // in unix epoch -> 9 April 2022

            _nftOwner = addr1.address; // To be changed
            const nftWallet = new ethers.Wallet(nftAddress);
            _nftAddress = nftWallet.address;
            _nftId = parseInt(nftId);
            _nftName = nftName;
            _nftImageURL = nftImageURL;
            _lenderAddress = addr1.address;
            _dueDate = 4294967295; // In Unix epoch - 7 feb 2106
            _dailyRent = 1000000;
            _collateral = 10000000000000;

            val = _dailyRent*_numberOfDays + _collateral;
        });

        it("Does borrower exists",async () => {
            await expect(contract.connect(addr1).returnNFT(_nftKey))
            .to.be.revertedWith("User does not exist");
        });

        it("Does Nft exists",async () => {
            await contract.connect(addr1).addUser(addr1.address);
            await expect(contract.connect(addr1).returnNFT(_nftKey))
            .to.be.revertedWith("NFT is not available");
        });

        it("Is Nft rented",async () => {
            await contract.connect(addr1).addUser(addr1.address);
            await contract.connect(addr1).addNFTToLend(
                _nftKey,_nftOwner,_nftAddress,_nftId,_nftName,
                _nftImageURL,_lenderAddress,_dueDate,_dailyRent,_collateral
            );

            await expect(contract.connect(addr1).returnNFT(_nftKey))
            .to.be.revertedWith("NFT is not rented");
        });

        it("Does user have the corresponding NFT rented",async () => {
            await contract.connect(addr1).addUser(addr1.address);
            await contract.connect(addr1).addNFTToLend(
                _nftKey,_nftOwner,_nftAddress,_nftId,_nftName,
                _nftImageURL,_lenderAddress,_dueDate,_dailyRent,_collateral
            );

            _borrowerAddress = addr2.address;
            await contract.connect(addr2).addUser(_borrowerAddress);
            await contract.connect(addr2).rentNft(
                _nftKey,_borrowerAddress,_numberOfDays,_rentalStartTime,
                {value: val}
            );

            await contract.connect(addr3).addUser(addr3.address);
            await expect(contract.connect(addr1).returnNFT(_nftKey))
            .to.be.revertedWith("User does not have any such NFTs as rent");
        });

        it("Case when nft is returned before due date",async () => {
            await contract.connect(addr1).addUser(addr1.address);
            await contract.connect(addr1).addNFTToLend(
                _nftKey,_nftOwner,_nftAddress,_nftId,_nftName,
                _nftImageURL,_lenderAddress,_dueDate,_dailyRent,_collateral
            );

            _borrowerAddress = addr2.address;
            await contract.connect(addr2).addUser(_borrowerAddress);
            await contract.connect(addr2).rentNft(
                _nftKey,_borrowerAddress,_numberOfDays,_rentalStartTime,
                {value: val}
            );

            const initBalance = await addr2.getBalance();
            const res = await contract.connect(addr2).returnNFT(_nftKey);
            const receipt = await res.wait();
            const gas = receipt.gasUsed.mul(receipt.effectiveGasPrice);

            const finalBalance = await addr2.getBalance();
            const diff = (finalBalance.sub(initBalance)).add(gas);
            expect(diff).to.equal(_collateral);

            const rentednft = await contract.connect(addr2).nftKeyToRentedNftDetails(_nftKey);
            expect(rentednft.nftKey).to.equal("");
            expect(rentednft.lenderAddress).to.equal("0x0000000000000000000000000000000000000000");
            expect(rentednft.borrowerAddress).to.equal("0x0000000000000000000000000000000000000000");
            expect(rentednft.numberOfDays).to.equal(0);
            expect(rentednft.rentalStartTime).to.equal(0);

            await expect(contract.connect(addr2).getUserRentedNFTDetails(_borrowerAddress,_nftKey))
            .to.be.revertedWith("User does not have any such rented Nft");

            let lendedNft_ = await contract.connect(addr1).getUserLendedNFTDetails(_lenderAddress,_nftKey);
            expect(lendedNft_.nftKey).to.equal(_nftKey);
            expect(lendedNft_.lenderAddress).to.equal(_lenderAddress);
            expect(lendedNft_.borrowerAddress).to.equal("0x0000000000000000000000000000000000000000");
            expect(lendedNft_.dueDate).to.equal(_dueDate);
            expect(lendedNft_.dailyRent).to.equal(_dailyRent);
            expect(lendedNft_.collateral).to.equal(_collateral);

            lendedNft_ = await contract.connect(addr1).nftKeyToLendedNftDetails(_nftKey);
            expect(lendedNft_.nftKey).to.equal(_nftKey);
            expect(lendedNft_.lenderAddress).to.equal(_lenderAddress);
            expect(lendedNft_.borrowerAddress).to.equal("0x0000000000000000000000000000000000000000");
            expect(lendedNft_.dueDate).to.equal(_dueDate);
            expect(lendedNft_.dailyRent).to.equal(_dailyRent);
            expect(lendedNft_.collateral).to.equal(_collateral);

            const key = await contract.connect(addr1).getNftKeysListAvaiableForRent();
            expect(key[0]).to.equal(_nftKey);
        });

        it("Case when nft is returned after due date",async () => {
            await contract.connect(addr1).addUser(addr1.address);
            await contract.connect(addr1).addNFTToLend(
                _nftKey,_nftOwner,_nftAddress,_nftId,_nftName,
                _nftImageURL,_lenderAddress,_dueDate,_dailyRent,_collateral
            );

            _borrowerAddress = addr2.address;
            await contract.connect(addr2).addUser(_borrowerAddress);
            await contract.connect(addr2).rentNft(
                _nftKey,_borrowerAddress,_numberOfDays,_rentalStartTime,
                {value: val}
            );

            await network.provider.send("evm_setNextBlockTimestamp", [4294967296]);
            await network.provider.send("evm_mine");

            const initBalance = await addr2.getBalance();
            const res = await contract.connect(addr2).returnNFT(_nftKey);
            const receipt = await res.wait();
            const gas = receipt.gasUsed.mul(receipt.effectiveGasPrice);

            const finalBalance = await addr2.getBalance();
            const diff = (finalBalance.sub(initBalance)).add(gas);
            expect(diff).to.equal(_collateral);

            const rentednft = await contract.connect(addr2).nftKeyToRentedNftDetails(_nftKey);
            expect(rentednft.nftKey).to.equal("");
            expect(rentednft.lenderAddress).to.equal("0x0000000000000000000000000000000000000000");
            expect(rentednft.borrowerAddress).to.equal("0x0000000000000000000000000000000000000000");
            expect(rentednft.numberOfDays).to.equal(0);
            expect(rentednft.rentalStartTime).to.equal(0);

            await expect(contract.connect(addr2).getUserRentedNFTDetails(_borrowerAddress,_nftKey))
            .to.be.revertedWith("User does not have any such rented Nft");

            await expect(contract.connect(addr1).getUserLendedNFTDetails(_lenderAddress,_nftKey))
            .to.be.revertedWith("User does not have any such lended Nft");
        });
    });
});