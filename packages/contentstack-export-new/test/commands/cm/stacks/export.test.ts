// import {expect, test} from '@oclif/test'

// describe('hello', () => {
//   test
//   .stdout()
//   .command(['hello', 'friend', '--from=oclif'])
//   .it('runs hello cmd', ctx => {
//     expect(ctx.stdout).to.contain('hello friend from oclif!')
//   })
// })

import { expect, test } from "@oclif/test";

describe("cm:stacks:export", () => {
  test
    // .nock('https://api.heroku.com', api => api
    //   .get('/account')
    //   // user is logged in, return their name
    //   .reply(200, {email: 'jeff@example.com'})
    // )
    .stdout()
    .command(["cm:stacks:export"])
    .it("shows user email when logged in", (ctx) => {
      console.log(ctx);
      // expect(ctx.stdout).to.equal('jeff@example.com\n')
    });

  // test
  //   .nock("https://api.heroku.com", (api) =>
  //     api
  //       .get("/account")
  //       // HTTP 401 means the user is not logged in with valid credentials
  //       .reply(401)
  //   )
  //   .command(["auth:whoami"])
  //   // checks to ensure the command exits with status 100
  //   .exit(100)
  //   .it("exits with status 100 when not logged in");
});
