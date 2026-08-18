import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const AccordPayModule = buildModule("AccordPayModule", (m) => {
  // Accepts a parameter for the settlement token (USDC address)
  const settlementToken = m.getParameter("settlementToken");

  const accordPay = m.contract("AccordPay", [settlementToken]);

  return { accordPay };
});

export default AccordPayModule;
