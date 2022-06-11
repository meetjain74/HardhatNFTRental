/**
 * @type import('hardhat/config').HardhatUserConfig
 */
require('@nomiclabs/hardhat-waffle');
require('hardhat-gas-reporter');

const { task } = require('hardhat/config');

// This is a sample Hardhat task
task('accounts', 'Prints the list of accounts', async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

task(
  'balances',
  'Prints the balance of each account',
  async (taskArgs, hre) => {
    const accounts = await hre.ethers.getSigners();

    for (const account of accounts) {
      console.log(
        account.address +
          ' -> ' +
          ((await account.getBalance()) / 1000000000000000000).toString() +
          ' ETH'
      );
    }
  }
);

const {
  privateKeyOwner,
  projectEndpoint,
  privateKeyAddr1,
  privateKeyAddr2,
  privateKeyAddr3
} = require('./secrets.json');

module.exports = {
  solidity: {
    version: '0.8.9',
    settings: {
      optimizer: {
        enabled: true,
        runs: 800
      },
      metadata: {
        bytecodeHash: 'none'
      }
    }
  },
  gasReporter: {
    enabled: true
  },
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true
    },
    mumbai: {
      url: projectEndpoint,
      accounts: [
        `0x${privateKeyOwner}`,
        `0x${privateKeyAddr1}`,
        `0x${privateKeyAddr2}`,
        `0x${privateKeyAddr3}`
      ]
    }
  }
};
