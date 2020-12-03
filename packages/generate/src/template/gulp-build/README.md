# Egnyte – Contentstack Extension 

#### About this extension
The Egnyte extension lets you fetch the files stored in your Egnyte account and display them into a field in your Content Type. Subsequently, while creating entries, you can select one or more of the listed files as input value for that field.


![Egnyte Plugin Screenshot](https://images.contentstack.io/v3/assets/blt83726f918894d893/blt1ff7c03b542e5f9c/5e8af5e46835b5306513bcef/egnyte.png)


#### How to use this extension
We have created a step-by-step guide on how to create a Egnyte extension for your content types. You can refer the [Egnyte extension guide](https://www.contentstack.com/docs/developers/create-custom-fields/egnyte)  on our documentation site for more info. 


#### Other Documentation
- [Extensions guide](https://www.contentstack.com/docs/guide/extensions)
- [Common questions about extensions](https://www.contentstack.com/docs/faqs#extensions)


#### Modifying Extension

To modify the extension, first clone this repo and install the dependencies. Then, edit the HTML, CSS and JS files from the source folder, and create a build using gulp task.

To install dependencies, run the following command in the root folder
```
npm install gulp-cli -g
npm install
```
To create new build for the extension, run the following command (index.html):

    gulp build

