import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const RwaTokenModule = buildModule("RwaTokenModule", (m) => {
    const name = m.getParameter("name", "Real World Asset Token");
    const symbol = m.getParameter("symbol", "RWA");

    const rwaToken = m.contract("RwaToken", [name, symbol]);

    return { rwaToken };
});

export default RwaTokenModule;