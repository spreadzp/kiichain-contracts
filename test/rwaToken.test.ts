import {
    loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";

describe("RwaToken", function () {
    // We define a fixture to reuse the same setup in every test.
    async function deployRwaTokenFixture() {
        const name = "Real World Asset Token";
        const symbol = "RWA"; 
        // Contracts are deployed using the first signer/account by default
        const [owner, otherAccount] = await hre.ethers.getSigners();

        const RwaToken = await hre.ethers.getContractFactory("RwaToken");
        const rwaToken = await RwaToken.deploy(name, symbol);

        return { rwaToken, name, symbol, owner, otherAccount };
    }

    describe("Deployment", function () {
        it("Should set the right name and symbol", async function () {
            const { rwaToken, name, symbol } = await loadFixture(deployRwaTokenFixture);

            expect(await rwaToken.name()).to.equal(name);
            expect(await rwaToken.symbol()).to.equal(symbol);
        });

        it("Should set the right owner", async function () {
            const { rwaToken, owner } = await loadFixture(deployRwaTokenFixture);

            expect(await rwaToken.owner()).to.equal(owner.address);
        });
    });

    describe("Minting", function () {
        it("Should mint a new token with the correct URL", async function () {
            const { rwaToken, owner } = await loadFixture(deployRwaTokenFixture);
            const url = "https://example.com/metadata";

            await rwaToken.mint(owner.address, url);

            const tokenId = 1;
            expect(await rwaToken.ownerOf(tokenId)).to.equal(owner.address);
            expect(await rwaToken.tokenURI(tokenId)).to.equal(url);
        });

        it("Should emit UrlUpdated event on minting", async function () {
            const { rwaToken, owner } = await loadFixture(deployRwaTokenFixture);
            const url = "https://example.com/metadata";

            await expect(rwaToken.mint(owner.address, url))
                .to.emit(rwaToken, "UrlUpdated")
                .withArgs(1, url);
        });
    });

    describe("Setting URL", function () {
        it("Should update the URL for a specific token", async function () {
            const { rwaToken, owner } = await loadFixture(deployRwaTokenFixture);
            const initialUrl = "https://example.com/metadata";
            const newUrl = "https://example.com/new-metadata";

            await rwaToken.mint(owner.address, initialUrl);
            await rwaToken.setUrl(1, newUrl);

            expect(await rwaToken.tokenURI(1)).to.equal(newUrl);
        });

        it("Should emit UrlUpdated event on URL update", async function () {
            const { rwaToken, owner } = await loadFixture(deployRwaTokenFixture);
            const initialUrl = "https://example.com/metadata";
            const newUrl = "https://example.com/new-metadata";

            await rwaToken.mint(owner.address, initialUrl);

            await expect(rwaToken.setUrl(1, newUrl))
                .to.emit(rwaToken, "UrlUpdated")
                .withArgs(1, newUrl);
        });

        it("Should revert if trying to set URL for nonexistent token", async function () {
            const { rwaToken } = await loadFixture(deployRwaTokenFixture);
            const newUrl = "https://example.com/new-metadata";

            await expect(rwaToken.setUrl(1, newUrl)).to.be.revertedWith(
                "RwaToken: URL set of nonexistent token"
            );
        });
    });

    describe("Getting URL", function () {
        it("Should return the correct URL for a specific token", async function () {
            const { rwaToken, owner } = await loadFixture(deployRwaTokenFixture);
            const url = "https://example.com/metadata";

            await rwaToken.mint(owner.address, url);

            expect(await rwaToken.tokenURI(1)).to.equal(url);
        });

        it("Should revert if trying to get URL for nonexistent token", async function () {
            const { rwaToken } = await loadFixture(deployRwaTokenFixture);

            await expect(rwaToken.tokenURI(1)).to.be.revertedWith(
                "RwaToken: URL query for nonexistent token"
            );
        });
    });
});