const { expect } = require("chai");
const { ethers } = require("hardhat");

/**
 * ZAI代币合约测试套件
 *
 * 测试场景：
 * 1. 部署和初始化
 * 2. 白名单机制
 * 3. 买入税（3%营销 + 2%燃烧）
 * 4. 卖出税（2%营销 + 3%燃烧）
 * 5. Mint功能和供应量限制
 * 6. 管理员功能
 */
describe("ZAI Token Contract", function () {
    let zai;
    let owner;
    let marketingWallet;
    let user1;
    let user2;
    let pancakePair;

    const INITIAL_SUPPLY = ethers.parseEther("10000000"); // 10M
    const MAX_SUPPLY = ethers.parseEther("15000000");     // 15M

    beforeEach(async function () {
        // 获取测试账户
        [owner, marketingWallet, user1, user2, pancakePair] = await ethers.getSigners();

        // 部署ZAI合约
        const ZAI = await ethers.getContractFactory("ZenithAI");
        zai = await ZAI.deploy(marketingWallet.address);
        await zai.waitForDeployment();

        // 设置交易对地址（模拟PancakeSwap pair）
        await zai.setPancakePair(pancakePair.address);
    });

    // ============ 1. 部署和初始化测试 ============
    describe("Deployment", function () {
        it("应该正确设置代币名称和符号", async function () {
            expect(await zai.name()).to.equal("ZenithAI");
            expect(await zai.symbol()).to.equal("ZAI");
        });

        it("应该mint初始供应量10M给部署者", async function () {
            const ownerBalance = await zai.balanceOf(owner.address);
            expect(ownerBalance).to.equal(INITIAL_SUPPLY);
        });

        it("应该正确设置营销钱包", async function () {
            expect(await zai.marketingWallet()).to.equal(marketingWallet.address);
        });

        it("应该正确设置交易对地址", async function () {
            expect(await zai.pancakePair()).to.equal(pancakePair.address);
        });

        it("应该将owner、合约、营销钱包加入初始白名单", async function () {
            expect(await zai.isWhitelisted(owner.address)).to.be.true;
            expect(await zai.isWhitelisted(await zai.getAddress())).to.be.true;
            expect(await zai.isWhitelisted(marketingWallet.address)).to.be.true;
        });

        it("应该正确设置初始费率", async function () {
            const fees = await zai.getFees();
            expect(fees[0]).to.equal(3); // buyMarketingFee
            expect(fees[1]).to.equal(2); // buyBurnFee
            expect(fees[2]).to.equal(2); // sellMarketingFee
            expect(fees[3]).to.equal(3); // sellBurnFee
        });
    });

    // ============ 2. 白名单机制测试 ============
    describe("Whitelist Mechanism", function () {
        it("白名单地址转账应该免税", async function () {
            const amount = ethers.parseEther("1000");

            // owner（白名单）转给user1
            await zai.transfer(user1.address, amount);

            // user1应该收到全额
            expect(await zai.balanceOf(user1.address)).to.equal(amount);
        });

        it("owner可以添加地址到白名单", async function () {
            await zai.setWhitelisted(user1.address, true);
            expect(await zai.isWhitelisted(user1.address)).to.be.true;
        });

        it("owner可以从白名单移除地址", async function () {
            await zai.setWhitelisted(user1.address, true);
            await zai.setWhitelisted(user1.address, false);
            expect(await zai.isWhitelisted(user1.address)).to.be.false;
        });

        it("可以批量添加白名单", async function () {
            await zai.setWhitelistedBatch([user1.address, user2.address], true);
            expect(await zai.isWhitelisted(user1.address)).to.be.true;
            expect(await zai.isWhitelisted(user2.address)).to.be.true;
        });

        it("非owner不能修改白名单", async function () {
            await expect(
                zai.connect(user1).setWhitelisted(user2.address, true)
            ).to.be.revertedWithCustomError(zai, "OwnableUnauthorizedAccount");
        });
    });

    // ============ 3. 买入税测试（3%营销 + 2%燃烧 = 5%） ============
    describe("Buy Tax (3% Marketing + 2% Burn)", function () {
        it("从交易对购买应该收取5%买入税", async function () {
            const buyAmount = ethers.parseEther("1000");

            // 给pancakePair一些代币（模拟流动性池）
            await zai.transfer(pancakePair.address, ethers.parseEther("100000"));

            // 模拟从交易对购买（pancakePair转给user1）
            await zai.connect(pancakePair).transfer(user1.address, buyAmount);

            // 计算预期收到的金额（扣除5%税）
            const expectedAmount = buyAmount * 95n / 100n; // 95%
            const marketingFee = buyAmount * 3n / 100n;    // 3%
            const burnFee = buyAmount * 2n / 100n;         // 2%

            // 验证user1收到的金额
            const user1Balance = await zai.balanceOf(user1.address);
            expect(user1Balance).to.equal(expectedAmount);

            // 验证营销钱包收到3%
            const marketingBalance = await zai.balanceOf(marketingWallet.address);
            expect(marketingBalance).to.equal(marketingFee);

            // 验证燃烧2%（零地址余额）
            const burnedAmount = await zai.balanceOf(ethers.ZeroAddress);
            expect(burnedAmount).to.equal(burnFee);
        });

        it("买入税应该正确分配到营销和燃烧", async function () {
            const buyAmount = ethers.parseEther("10000");

            await zai.transfer(pancakePair.address, ethers.parseEther("100000"));

            const marketingBalanceBefore = await zai.balanceOf(marketingWallet.address);
            const totalSupplyBefore = await zai.totalSupply();

            await zai.connect(pancakePair).transfer(user1.address, buyAmount);

            const marketingBalanceAfter = await zai.balanceOf(marketingWallet.address);
            const totalSupplyAfter = await zai.totalSupply();

            // 营销钱包应该增加3%
            expect(marketingBalanceAfter - marketingBalanceBefore).to.equal(buyAmount * 3n / 100n);

            // 总供应量应该减少2%（燃烧）
            expect(totalSupplyBefore - totalSupplyAfter).to.equal(buyAmount * 2n / 100n);
        });
    });

    // ============ 4. 卖出税测试（2%营销 + 3%燃烧 = 5%） ============
    describe("Sell Tax (2% Marketing + 3% Burn)", function () {
        it("卖到交易对应该收取5%卖出税", async function () {
            const sellAmount = ethers.parseEther("1000");

            // 给user1一些代币
            await zai.transfer(user1.address, ethers.parseEther("10000"));

            // 移除user1的白名单（确保收税）
            await zai.setWhitelisted(user1.address, false);

            // 模拟卖出（user1转给pancakePair）
            await zai.connect(user1).transfer(pancakePair.address, sellAmount);

            // 计算预期交易对收到的金额（扣除5%税）
            const expectedAmount = sellAmount * 95n / 100n; // 95%
            const marketingFee = sellAmount * 2n / 100n;    // 2%
            const burnFee = sellAmount * 3n / 100n;         // 3%

            // 验证交易对收到的金额
            const pairBalance = await zai.balanceOf(pancakePair.address);
            expect(pairBalance).to.equal(expectedAmount);

            // 验证营销钱包收到2%
            const marketingBalance = await zai.balanceOf(marketingWallet.address);
            expect(marketingBalance).to.equal(marketingFee);

            // 验证燃烧3%
            const burnedAmount = await zai.balanceOf(ethers.ZeroAddress);
            expect(burnedAmount).to.equal(burnFee);
        });

        it("卖出税应该正确分配到营销和燃烧", async function () {
            const sellAmount = ethers.parseEther("5000");

            await zai.transfer(user1.address, ethers.parseEther("10000"));
            await zai.setWhitelisted(user1.address, false);

            const marketingBalanceBefore = await zai.balanceOf(marketingWallet.address);
            const totalSupplyBefore = await zai.totalSupply();

            await zai.connect(user1).transfer(pancakePair.address, sellAmount);

            const marketingBalanceAfter = await zai.balanceOf(marketingWallet.address);
            const totalSupplyAfter = await zai.totalSupply();

            // 营销钱包应该增加2%
            expect(marketingBalanceAfter - marketingBalanceBefore).to.equal(sellAmount * 2n / 100n);

            // 总供应量应该减少3%（燃烧）
            expect(totalSupplyBefore - totalSupplyAfter).to.equal(sellAmount * 3n / 100n);
        });
    });

    // ============ 5. 普通转账测试（不收税） ============
    describe("Regular Transfer (No Tax)", function () {
        it("钱包到钱包的转账不应该收税", async function () {
            const amount = ethers.parseEther("1000");

            // owner转给user1
            await zai.transfer(user1.address, amount);

            // user1转给user2（都不是交易对，不收税）
            await zai.connect(user1).transfer(user2.address, amount);

            // user2应该收到全额
            expect(await zai.balanceOf(user2.address)).to.equal(amount);
        });
    });

    // ============ 6. Mint功能测试 ============
    describe("Mint Function", function () {
        it("owner可以mint代币给质押合约", async function () {
            const mintAmount = ethers.parseEther("1000000"); // 1M

            await zai.mint(user1.address, mintAmount);

            expect(await zai.balanceOf(user1.address)).to.equal(mintAmount);
            expect(await zai.totalSupply()).to.equal(INITIAL_SUPPLY + mintAmount);
        });

        it("不能超过最大供应量15M", async function () {
            const excessAmount = ethers.parseEther("6000000"); // 会超过15M

            await expect(
                zai.mint(user1.address, excessAmount)
            ).to.be.revertedWith("ZAI: Exceeds maximum supply");
        });

        it("非owner不能mint", async function () {
            await expect(
                zai.connect(user1).mint(user2.address, ethers.parseEther("1000"))
            ).to.be.revertedWithCustomError(zai, "OwnableUnauthorizedAccount");
        });

        it("getRemainingMintable应该返回正确的剩余额度", async function () {
            const remaining = await zai.getRemainingMintable();
            expect(remaining).to.equal(MAX_SUPPLY - INITIAL_SUPPLY); // 5M

            // mint 1M后
            await zai.mint(user1.address, ethers.parseEther("1000000"));
            const remainingAfter = await zai.getRemainingMintable();
            expect(remainingAfter).to.equal(ethers.parseEther("4000000")); // 4M
        });
    });

    // ============ 7. 费率调整测试 ============
    describe("Fee Adjustment", function () {
        it("owner可以调整费率（保持总税5%）", async function () {
            // 调整为买入4%营销+1%燃烧，卖出1%营销+4%燃烧
            await zai.setFees(4, 1, 1, 4);

            const fees = await zai.getFees();
            expect(fees[0]).to.equal(4);
            expect(fees[1]).to.equal(1);
            expect(fees[2]).to.equal(1);
            expect(fees[3]).to.equal(4);
        });

        it("费率调整必须保持买入总税5%", async function () {
            await expect(
                zai.setFees(4, 2, 2, 3) // 买入6%
            ).to.be.revertedWith("ZAI: Buy fees must total 5%");
        });

        it("费率调整必须保持卖出总税5%", async function () {
            await expect(
                zai.setFees(3, 2, 3, 3) // 卖出6%
            ).to.be.revertedWith("ZAI: Sell fees must total 5%");
        });
    });

    // ============ 8. 营销钱包更新测试 ============
    describe("Marketing Wallet Update", function () {
        it("owner可以更新营销钱包", async function () {
            await zai.setMarketingWallet(user1.address);
            expect(await zai.marketingWallet()).to.equal(user1.address);
        });

        it("新营销钱包应该自动加入白名单", async function () {
            await zai.setMarketingWallet(user1.address);
            expect(await zai.isWhitelisted(user1.address)).to.be.true;
        });
    });

    // ============ 9. 查询函数测试 ============
    describe("Query Functions", function () {
        it("getCirculatingSupply应该返回当前供应量", async function () {
            expect(await zai.getCirculatingSupply()).to.equal(INITIAL_SUPPLY);
        });

        it("getTotalBurned应该返回累计燃烧量", async function () {
            // 执行一次卖出交易产生燃烧
            await zai.transfer(user1.address, ethers.parseEther("10000"));
            await zai.setWhitelisted(user1.address, false);
            await zai.connect(user1).transfer(pancakePair.address, ethers.parseEther("1000"));

            // 卖出1000，燃烧3% = 30
            const burned = await zai.getTotalBurned();
            expect(burned).to.equal(ethers.parseEther("30"));
        });
    });
});
