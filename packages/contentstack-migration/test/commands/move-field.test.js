"use strict";

const { constants } = require("../setup");
const { migrationPath } = constants;
const path = require("path");
const nockBack = require("nock").back;
const { expect, test } = require("@oclif/test");

describe("Move field test from migration script", () => {
  nockBack.fixtures = path.join(__dirname, "__nock-fixtures__");
  nockBack.setMode("record");
  describe("prepare for edit field test", () => {
    test
      .command([
        "cm:migration",
        "-n",
        `${migrationPath}/create-ct/create-ct-opts.js`,
        "-A",
        "-k",
        "bltmock9e992a923aafdmock521adc4b5b3",
      ])
      .it("Should create content type", () => {});
  });
  describe("Move field", () => {
    nockBack("move-field.json", (nockDone) => {
      test
        .stdout()
        .command([
          "cm:migration",
          "-n",
          `${migrationPath}/move-field/move-field.js`,
          "-A",
          "-k",
          "bltmock9e992a923aafdmock521adc4b5b3",
        ])
        .it("Should move the field successfully for content type", (ctx) => {
          expect(ctx.stdout).to.contains(
            "Successfully updated content type: foo3"
          );
          nockDone();
        });

      test
        .stdout()
        .command([
          "cm:migration",
          "-n",
          `${migrationPath}/move-field/move-invalid-method.js`,
          "-A",
          "-k",
          "bltmock9e992a923aafdmock521adc4b5b3",
        ])
        .it("Should show error message on invalid method call", (ctx) => {
          expect(ctx.stdout).to.contains("toTheBotto is not a valid function");
          nockDone();
        });
    });
  });
  describe("wind up field test", () => {
    test
      .command([
        "cm:migration",
        "-n",
        `${migrationPath}/edit-ct/delete-ct.js`,
        "-A",
        "-k",
        "bltmock9e992a923aafdmock521adc4b5b3",
      ])
      .it("Should delete content type", () => {});
  });
});
