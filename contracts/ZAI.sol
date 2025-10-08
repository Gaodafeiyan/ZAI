// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ZenithAI (ZAI) Token
 * @dev BEP-20代币，部署在Binance Smart Chain (BSC)
 *
 * ============ 核心功能 ============
 * 1. 总供应量：初始10,000,000 ZAI（可增发至最大15,000,000）
 * 2. 交易税机制：
 *    - 买入税：3%营销 + 2%燃烧 = 5%
 *    - 卖出税：2%营销 + 3%燃烧 = 5%
 * 3. 白名单机制：白名单地址免除所有交易税
 * 4. Mint功能：owner可增发代币给质押合约（最大15M上限）
 * 5. 权限控制：owner管理白名单、费率、营销钱包（后期转移给DAO）
 *
 * ============ 部署流程 ============
 * 1. 部署合约（传入营销钱包地址）
 * 2. 在PancakeSwap创建ZAI/WBNB交易对
 * 3. 调用setPancakePair设置交易对地址
 * 4. 添加流动性，开始交易
 */
contract ZenithAI is ERC20, Ownable {
    // ============ 常量 ============

    /// @notice 最大供应量上限：15,000,000 ZAI（防止无限增发）
    uint256 public constant MAX_SUPPLY = 15_000_000 * 10**18;

    // ============ 状态变量 ============

    /// @notice 营销钱包地址，接收交易税中的营销费用
    address public marketingWallet;

    /// @notice PancakeSwap交易对地址（部署后手动设置）
    address public pancakePair;

    /// @notice 买入时的营销费率（初始3%，可调整但买入总税必须5%）
    uint256 public buyMarketingFee = 3;

    /// @notice 买入时的燃烧费率（初始2%）
    uint256 public buyBurnFee = 2;

    /// @notice 卖出时的营销费率（初始2%，可调整但卖出总税必须5%）
    uint256 public sellMarketingFee = 2;

    /// @notice 卖出时的燃烧费率（初始3%）
    uint256 public sellBurnFee = 3;

    /// @notice 白名单映射，白名单地址交易时免税
    mapping(address => bool) private whitelisted;

    // ============ 事件 ============

    /// @notice 白名单状态变更事件
    /// @param account 地址
    /// @param status true=加入白名单，false=移除
    event WhitelistUpdated(address indexed account, bool status);

    /// @notice 交易对地址设置事件
    /// @param pair PancakeSwap交易对地址
    event PancakePairSet(address indexed pair);

    /// @notice 费率更新事件
    event FeesUpdated(uint256 buyMarketing, uint256 buyBurn, uint256 sellMarketing, uint256 sellBurn);

    /// @notice 营销钱包更新事件
    event MarketingWalletUpdated(address indexed newWallet);

    /// @notice 代币增发事件
    /// @param to 接收地址
    /// @param amount 增发数量
    event TokensMinted(address indexed to, uint256 amount);

    // ============ 构造函数 ============

    /**
     * @dev 初始化ZAI代币
     * @param _marketingWallet 营销钱包地址（接收交易税）
     *
     * 初始化操作：
     * 1. 铸造10,000,000 ZAI给部署者（后期9M锁挖矿，1M流通）
     * 2. 设置营销钱包
     * 3. 将owner、合约自身、营销钱包加入初始白名单（免税）
     */
    constructor(address _marketingWallet)
        ERC20("ZenithAI", "ZAI")
        Ownable(msg.sender)
    {
        require(_marketingWallet != address(0), "ZAI: Marketing wallet cannot be zero address");

        // 铸造初始总供应量：10,000,000 ZAI给部署者
        _mint(msg.sender, 10_000_000 * 10 ** decimals());

        // 设置营销钱包
        marketingWallet = _marketingWallet;

        // 初始化白名单：owner、合约自身、营销钱包免税
        whitelisted[msg.sender] = true;
        whitelisted[address(this)] = true;
        whitelisted[_marketingWallet] = true;

        emit MarketingWalletUpdated(_marketingWallet);
        emit WhitelistUpdated(msg.sender, true);
        emit WhitelistUpdated(address(this), true);
        emit WhitelistUpdated(_marketingWallet, true);
    }

    // ============ 核心转账逻辑（税收机制） ============

    /**
     * @dev 重写ERC20转账逻辑，实现税收机制
     * @param from 发送方地址
     * @param to 接收方地址
     * @param amount 转账金额
     *
     * ============ 税收逻辑 ============
     * 1. 白名单检测：如果发送方或接收方在白名单，免税直接转账
     * 2. 交易类型检测：
     *    - 买入：from == pancakePair（用户从DEX购买ZAI）
     *    - 卖出：to == pancakePair（用户卖ZAI到DEX）
     *    - 普通转账：不涉及交易对，不收税
     * 3. 税费计算：
     *    - 买入税：营销费3% + 燃烧费2% = 5%
     *    - 卖出税：营销费2% + 燃烧费3% = 5%
     * 4. 税费分配：
     *    - 营销费 → 转到营销钱包
     *    - 燃烧费 → 转到零地址（永久销毁）
     * 5. 实际转账：扣除税费后的金额转给接收方
     */
    function _update(address from, address to, uint256 amount) internal override {
        // 白名单地址免税（包括owner、合约自身、营销钱包等）
        if (whitelisted[from] || whitelisted[to]) {
            super._update(from, to, amount);
            return;
        }

        uint256 marketingFee = 0;
        uint256 burnFee = 0;

        // 检测买入交易（从PancakeSwap交易对购买ZAI）
        if (from == pancakePair && pancakePair != address(0)) {
            marketingFee = (amount * buyMarketingFee) / 100;
            burnFee = (amount * buyBurnFee) / 100;
        }
        // 检测卖出交易（卖ZAI到PancakeSwap交易对）
        else if (to == pancakePair && pancakePair != address(0)) {
            marketingFee = (amount * sellMarketingFee) / 100;
            burnFee = (amount * sellBurnFee) / 100;
        }
        // 普通转账（钱包到钱包），不收税

        // 计算总税费
        uint256 totalFees = marketingFee + burnFee;

        if (totalFees > 0) {
            // 转账营销费到营销钱包
            if (marketingFee > 0) {
                super._update(from, marketingWallet, marketingFee);
            }

            // 燃烧代币（转到零地址，永久销毁，减少总供应量）
            if (burnFee > 0) {
                super._update(from, address(0), burnFee);
            }

            // 减去税费后的实际转账金额
            amount -= totalFees;
        }

        // 执行实际转账（接收方收到扣税后的金额）
        super._update(from, to, amount);
    }

    // ============ 白名单管理（仅owner，后期转DAO） ============

    /**
     * @notice 设置单个地址的白名单状态
     * @param account 目标地址
     * @param status true=加入白名单（免税），false=移除白名单
     *
     * 用途：
     * - 种子用户免税
     * - 质押合约、奖励合约等免税
     * - 合作伙伴地址免税
     */
    function setWhitelisted(address account, bool status) public onlyOwner {
        require(account != address(0), "ZAI: Cannot whitelist zero address");
        whitelisted[account] = status;
        emit WhitelistUpdated(account, status);
    }

    /**
     * @notice 批量设置白名单状态（节省gas费用）
     * @param accounts 地址数组
     * @param status 统一设置的状态
     *
     * 示例：批量添加100个种子用户到白名单
     */
    function setWhitelistedBatch(address[] calldata accounts, bool status) external onlyOwner {
        for (uint256 i = 0; i < accounts.length; i++) {
            require(accounts[i] != address(0), "ZAI: Cannot whitelist zero address");
            whitelisted[accounts[i]] = status;
            emit WhitelistUpdated(accounts[i], status);
        }
    }

    /**
     * @notice 查询地址是否在白名单中
     * @param account 查询地址
     * @return 是否在白名单（true=免税，false=正常收税）
     */
    function isWhitelisted(address account) external view returns (bool) {
        return whitelisted[account];
    }

    // ============ Mint功能（为质押合约增发） ============

    /**
     * @notice 增发代币（仅owner，用于后续质押奖励等）
     * @param to 接收地址（通常是质押合约地址）
     * @param amount 增发数量
     *
     * 限制：
     * - 仅owner可调用（后期转DAO治理）
     * - 总供应量不能超过MAX_SUPPLY（15,000,000 ZAI）
     *
     * 用途：
     * - 为质押合约铸造奖励代币
     * - 为流动性挖矿铸造奖励
     * - 其他生态激励
     */
    function mint(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "ZAI: Cannot mint to zero address");
        require(totalSupply() + amount <= MAX_SUPPLY, "ZAI: Exceeds maximum supply");

        _mint(to, amount);
        emit TokensMinted(to, amount);
    }

    // ============ 管理员功能（仅owner，后期转DAO） ============

    /**
     * @notice 设置PancakeSwap交易对地址（部署后手动调用）
     * @param _pancakePair 交易对地址（ZAI/WBNB pair）
     *
     * 流程：
     * 1. 在PancakeSwap手动创建ZAI/WBNB交易对
     * 2. 获取pair地址
     * 3. 调用此函数设置pair地址
     * 4. 之后买卖交易会自动收税
     */
    function setPancakePair(address _pancakePair) external onlyOwner {
        require(_pancakePair != address(0), "ZAI: Pair cannot be zero address");
        pancakePair = _pancakePair;
        emit PancakePairSet(_pancakePair);
    }

    /**
     * @notice 更新营销钱包地址
     * @param _marketingWallet 新的营销钱包地址
     *
     * 注意：新营销钱包会自动加入白名单（免税）
     */
    function setMarketingWallet(address _marketingWallet) external onlyOwner {
        require(_marketingWallet != address(0), "ZAI: Marketing wallet cannot be zero address");

        // 移除旧营销钱包的白名单（可选，如果需要）
        // whitelisted[marketingWallet] = false;

        marketingWallet = _marketingWallet;

        // 自动将新营销钱包加入白名单
        whitelisted[_marketingWallet] = true;

        emit MarketingWalletUpdated(_marketingWallet);
        emit WhitelistUpdated(_marketingWallet, true);
    }

    /**
     * @notice 调整交易费率（必须保持买入和卖出总计各5%）
     * @param _buyMarketing 买入营销费率
     * @param _buyBurn 买入燃烧费率
     * @param _sellMarketing 卖出营销费率
     * @param _sellBurn 卖出燃烧费率
     *
     * 限制：
     * - 买入总税 = _buyMarketing + _buyBurn = 5%
     * - 卖出总税 = _sellMarketing + _sellBurn = 5%
     *
     * 示例：可以调整为买入4%营销+1%燃烧，卖出1%营销+4%燃烧
     */
    function setFees(
        uint256 _buyMarketing,
        uint256 _buyBurn,
        uint256 _sellMarketing,
        uint256 _sellBurn
    ) external onlyOwner {
        require(_buyMarketing + _buyBurn == 5, "ZAI: Buy fees must total 5%");
        require(_sellMarketing + _sellBurn == 5, "ZAI: Sell fees must total 5%");

        buyMarketingFee = _buyMarketing;
        buyBurnFee = _buyBurn;
        sellMarketingFee = _sellMarketing;
        sellBurnFee = _sellBurn;

        emit FeesUpdated(_buyMarketing, _buyBurn, _sellMarketing, _sellBurn);
    }

    // ============ 查询函数（公开只读） ============

    /**
     * @notice 获取当前流通供应量（会随着燃烧减少）
     * @return 当前流通中的代币总量
     */
    function getCirculatingSupply() external view returns (uint256) {
        return totalSupply();
    }

    /**
     * @notice 获取累计燃烧数量
     * @return 已燃烧的代币数量（初始供应 - 当前供应）
     */
    function getTotalBurned() external view returns (uint256) {
        return balanceOf(address(0));
    }

    /**
     * @notice 获取剩余可增发额度
     * @return 还可以mint的代币数量（MAX_SUPPLY - 当前总供应）
     */
    function getRemainingMintable() external view returns (uint256) {
        return MAX_SUPPLY - totalSupply();
    }

    /**
     * @notice 获取当前所有费率配置
     * @return _buyMarketing 买入营销费率
     * @return _buyBurn 买入燃烧费率
     * @return _sellMarketing 卖出营销费率
     * @return _sellBurn 卖出燃烧费率
     */
    function getFees() external view returns (
        uint256 _buyMarketing,
        uint256 _buyBurn,
        uint256 _sellMarketing,
        uint256 _sellBurn
    ) {
        return (buyMarketingFee, buyBurnFee, sellMarketingFee, sellBurnFee);
    }
}
