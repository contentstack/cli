Contentstack CLI’s “Bootstrap” plugin enables you to automate the process of setting up projects for sample and starter apps  in Contentstack.

This means that all the required steps such as stack, environment, and content type creation, entry and asset publishing are performed just by using a single command.

Usage:
$ csdx cm:bootstrap

After running the “Bootstrap” command, follow the steps below to complete the setup:

App Preference: Select the app (starter or sample) you want to clone from the list of available options.
Technology: Select the app framework (React, Angular, Node, and so on) in which you want to set up the project.
Path: Provide the destination folder path/location where the app will be cloned.
Organization name: Select your organization name from the provided list.
Stack: Select the stack where you want to import the content of the app. You can also create a new stack and for the import operation.

These steps will help you kickstart your app.
$ csdx cm:bootstrap -s <sampleapp or starterapp> -t <optional github private repo token> -a <app name> -d <path or the location of the folder to clone the app>

Options:

-s, sampleapp or starterapp: The type of app you want to clone.
 -t: (optional) The token of your private repo to access the project.
-a, --appName: The app name, eg. Gatsby, Next, Nuxt, etc.
-d, --data: Specify the path or the location of the folder to clone the app.
