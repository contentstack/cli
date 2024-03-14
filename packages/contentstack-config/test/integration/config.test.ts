import * as path from "path";
import { expect, test } from "@oclif/test";
// @ts-ignore
import { Helper } from "./utils";
import { cliux, messageHandler } from "@contentstack/cli-utilities";
// @ts-ignore
import { PRINT_LOGS, CDA, CMA, REGION_NAME } from "./config.json";

const messageFilePath = path.join(
  __dirname,
  "..",
  "..",
  "..",
  "contentstack-config",
  "messages/index.json"
);

describe("ContentStack-Config plugin test", () => {
  beforeEach(() => {
    messageHandler.init({ messageFilePath });
  });
  afterEach(() => {
    messageHandler.init({ messageFilePath: "" });
  });

  describe('Running config:set:region command without any flags and set AZURE-NA as Region', () => {
    test
      .stub(cliux, 'inquire', async () => 'AZURE-NA')
      .stdout({ print: PRINT_LOGS || false })
      .command(['config:set:region'])
      .it('Check config:set:region command output [It should set AZURE-NA as region]', (ctx) => {
        expect(ctx.stdout)
          .to.be.a('string')
          .that.have.includes(
            'Region has been set to AZURE-NA\nCDA HOST: https://azure-na-cdn.contentstack.com\nCMA HOST: https://azure-na-api.contentstack.com\n',
            'AZURE-NA region is not setup.!',
          );
      });
  });

  describe('Running config:set:region command without any flags and set AZURE-EU as Region', () => {
    test
      .stub(cliux, 'inquire', async () => 'AZURE-EU')
      .stdout({ print: PRINT_LOGS || false })
      .command(['config:set:region'])
      .it('Check config:set:region command output [It should set AZURE-EU as region]', (ctx) => {
        expect(ctx.stdout)
          .to.be.a('string')
          .that.have.includes(
            'Region has been set to AZURE-EU\nCDA HOST: https://azure-eu-cdn.contentstack.com\nCMA HOST: https://azure-eu-api.contentstack.com\n',
            'AZURE-EU region is not setup.!',
          );
      });
  });

  describe("Running config:set:region command with arg as NA region", () => {
    test
      .stdout({ print: PRINT_LOGS || false })
      .command(["config:set:region", "NA"])
      .it("Check NA region has setup", (ctx) => {
        expect(ctx.stdout).to.equal(
          "Region has been set to NA\nCDA HOST: https://cdn.contentstack.io\nCMA HOST: https://api.contentstack.io\n"
        );
      });
  });

  describe("Running config:set:region command with custom Name, CMA, CDA flags", () => {
    test
      .stdout({ print: PRINT_LOGS || false })
      .command([
        "config:set:region",
        `-n=${REGION_NAME || "Test"}`,
        `-d=${CDA || "https://cdn.contentstack.io"}`,
        `-m=${CMA || "https://api.contentstack.io"}`,
      ])
      .it(
        `Check Name=${REGION_NAME || "Test"}, CDA=${
          CDA || "https://cdn.contentstack.io"
        }, CMA=${CMA || "https://api.contentstack.io"} values has setup`,
        (ctx) => {
          expect(ctx.stdout).to.equal(
            `Custom region has been set to ${
              REGION_NAME || "Test"
            }\nCMA HOST: ${CMA || "https://api.contentstack.io"}\nCDA HOST: ${
              CDA || "https://cdn.contentstack.io"
            }\n`
          );
        }
      );
  });

  describe("Running config:set:region command without any flags and setting custom values", () => {
    test
      // @ts-ignore
      .stub(cliux, "inquire", async (inquire) => {
        switch (inquire.name) {
          case "selectedRegion":
            return "custom";
          case "name":
            return REGION_NAME || "Test";
          case "cma":
            return CMA || "https://api.contentstack.io";
          case "cda":
            return CDA || "https://cdn.contentstack.io";
        }
      })
      .stdout({ print: PRINT_LOGS || false })
      .stderr()
      .command(["config:set:region"])
      .it("Verifying output with custom values", async (ctx) => {
        expect(ctx.stdout)
          .to.be.a("string")
          .that.have.includes(
            `Custom region has been set to ${
              REGION_NAME || "Test"
            }\nCMA HOST: ${CMA || "https://api.contentstack.io"}\nCDA HOST: ${
              CDA || "https://cdn.contentstack.io"
            }\n`,
            "Custom CDA, CMA setup failed.!"
          );
      });
  });

  describe("Running config:get:region command", () => {
    let currentRegion;
    before(async () => {
      currentRegion = await Helper.run();
    });
    after(() => {
      currentRegion = null;
    });

    test
      .stdout({ print: PRINT_LOGS || false })
      .command(["config:get:region"])
      .it("Should print current region and it's CDA, CMA as", (ctx) => {
        expect(ctx.stdout, "Expected output not found.!").to.equal(
          `Currently using ${currentRegion.name} region\nCDA HOST: ${currentRegion.cda}\nCMA HOST: ${currentRegion.cma}\n`
        );
      });
  });

  // describe('Running config:get:region command to check if a region is setup', () => {
  //   let currentRegion;
  //   before(async () => {
  //     currentRegion = await Helper.run();
  //   });
  //   after(() => {
  //     currentRegion = null;
  //   });

  //   test
  //     .stdout({ print: PRINT_LOGS || false })
  //     .command(['config:get:region'])
  //     .catch((error) => {
  //       if (error.message) {
  //         expect(error.message).to.be.a('string').equals('EEXIT: 0');
  //       }
  //     })
  //     .it("Should print current region and it's CDA, CMA or region should be undefined", (ctx) => {
  //       if (currentRegion) {
  //         expect(ctx.stdout).to.includes(
  //           `Currently using ${currentRegion.name} region\nCDA HOST: ${currentRegion.cda}\nCMA HOST: ${currentRegion.cma}\n`,
  //         );
  //       } else {
  //         expect(ctx.error).to.be.undefined;
  //       }
  //     });
  // });
});
