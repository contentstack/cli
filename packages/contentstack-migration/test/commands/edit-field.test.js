"use strict";

const { constants } = require("../setup");
const { migrationPath } = constants;
const path = require("path");
const nockBack = require("nock").back;
const { expect, test } = require("@oclif/test");

describe("Edit field test", () => {
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
  describe("prepare for edit field test", () => {
    nockBack("edit-field.json", (nockDone) => {
      test
        .stdout()
        .command([
          "cm:migration",
          "-n",
          `${migrationPath}/edit-field/edit-field.js`,
          "-A",
          "-k",
          "bltmock9e992a923aafdmock521adc4b5b3",
        ])
        .it("Should edit the field successfully for content type", (ctx) => {
          expect(ctx.stdout).to.contains(
            "Successfully updated content type: foo3"
          );
          nockDone();
        });

      // test
      // .stdout()
      // .command(['cm:migration', '-n', `${migrationPath}/edit-field/edit-invalid-field.js`, '-A', '-k', 'bltmock9e992a923aafdmock521adc4b5b3'])
      // .it('Should show error message on invalid method call', ctx => {
      //   expect(ctx.stdout).to.contains('_uniqueid does not exist in the schema. Please check again')
      //   nockDone()
      // })

      test
        .stdout()
        .command([
          "cm:migration",
          "-n",
          `${migrationPath}/edit-field/edit-invalid-method.js`,
          "-A",
          "-k",
          "bltmock9e992a923aafdmock521adc4b5b3",
        ])
        .it("Should show error message invalid method access", (ctx) => {
          expect(ctx.stdout).to.contains(
            " display_nam is not a valid function"
          );
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
