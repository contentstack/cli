## Classes

<dl>
<dt><a href="#Base">Base</a></dt>
<dd></dd>
<dt><a href="#ContentType">ContentType</a></dt>
<dd></dd>
<dt><a href="#Field">Field</a></dt>
<dd></dd>
<dt><a href="#Migration">Migration</a></dt>
<dd></dd>
</dl>

<a name="Base"></a>

## Base
**Kind**: global class  

* [Base](#Base)
    * [new Base()](#new_Base_new)
    * [.title(value)](#Base+title)
    * [.description(value)](#Base+description)
    * [.force(value)](#Base+force)
    * [.dispatch(callsite, id, opts, method)](#Base+dispatch)

<a name="new_Base_new"></a>

### new Base()
Base class for module classes

<a name="Base+title"></a>

### base.title(value)
Chained function which takes value for title

**Kind**: instance method of [<code>Base</code>](#Base)  

| Param | Type | Description |
| --- | --- | --- |
| value | <code>string</code> | Title |

<a name="Base+description"></a>

### base.description(value)
Chained function which takes value for description

**Kind**: instance method of [<code>Base</code>](#Base)  

| Param | Type | Description |
| --- | --- | --- |
| value | <code>string</code> | Description |

<a name="Base+force"></a>

### base.force(value)
Chained function takes boolean value for force while deleting content type

**Kind**: instance method of [<code>Base</code>](#Base)  

| Param | Type | Description |
| --- | --- | --- |
| value | <code>boolean</code> | Force delete |

<a name="Base+dispatch"></a>

### base.dispatch(callsite, id, opts, method)
Accumulates actions for validating user provided inputs

**Kind**: instance method of [<code>Base</code>](#Base)  

| Param | Type | Description |
| --- | --- | --- |
| callsite | <code>Object</code> | Gets the file location and file number of caller |
| id | <code>string</code> | unique id of action type |
| opts | <code>Object</code> | holds payload to be validated |
| method | <code>string</code> | type of action |

<a name="ContentType"></a>

## ContentType
**Kind**: global class  

* [ContentType](#ContentType)
    * [new ContentType()](#new_ContentType_new)
    * [.createContentType(id, opts)](#ContentType+createContentType)
    * [.singleton(value)](#ContentType+singleton)
    * [.isPage()](#ContentType+isPage)
    * [.editContentType(id, opts)](#ContentType+editContentType)
    * [.deleteContentType(id)](#ContentType+deleteContentType)

<a name="new_ContentType_new"></a>

### new ContentType()
ContentType class

<a name="ContentType+createContentType"></a>

### contentType.createContentType(id, opts)
Creates content type by passing content type name and options

**Kind**: instance method of [<code>ContentType</code>](#ContentType)  

| Param | Type | Description |
| --- | --- | --- |
| id | <code>string</code> | Content type UID |
| opts | <code>Object</code> | Optional: Content type fields definition |

**Example**  
```js
module.exports = {migrations} => {
 const blog = migrations.createContentType('blog', {
   title: 'blog'
 })
}
```
<a name="ContentType+singleton"></a>

### contentType.singleton(value)
Set content type to singleton or multiple

**Kind**: instance method of [<code>ContentType</code>](#ContentType)  

| Param | Type | Description |
| --- | --- | --- |
| value | <code>boolean</code> | set value true to set content type as singleton |

<a name="ContentType+isPage"></a>

### contentType.isPage()
Set content type to singleton or multiple

**Kind**: instance method of [<code>ContentType</code>](#ContentType)  
<a name="ContentType+editContentType"></a>

### contentType.editContentType(id, opts)
Edits content type by passing content type name and options

**Kind**: instance method of [<code>ContentType</code>](#ContentType)  

| Param | Type | Description |
| --- | --- | --- |
| id | <code>string</code> | Content type UID |
| opts | <code>Object</code> | Optional: Content type fields definition |

**Example**  
```js
module.exports = {migrations} => {
 const blog = migrations.editContentType('blog', {
   title: 'blog'
 });
 blog.description('Changed description');
}
```
<a name="ContentType+deleteContentType"></a>

### contentType.deleteContentType(id)
Deletes content type by passing content type name

**Kind**: instance method of [<code>ContentType</code>](#ContentType)  

| Param | Type | Description |
| --- | --- | --- |
| id | <code>string</code> | Content type UID |

**Example**  
```js
module.exports = {migrations} => {
 const blog = migrations.deleteContentType('blog');
}
```
<a name="Field"></a>

## Field
**Kind**: global class  

* [Field](#Field)
    * [new Field()](#new_Field_new)
    * [.createField(field, opts)](#Field+createField)
    * [.editField(field, opts)](#Field+editField)
    * [.deleteField(field)](#Field+deleteField)
    * [.moveField(field)](#Field+moveField)

<a name="new_Field_new"></a>

### new Field()
Field class

<a name="Field+createField"></a>

### field.createField(field, opts)
Creates a field with provided uid.

**Kind**: instance method of [<code>Field</code>](#Field)  

| Param | Type | Description |
| --- | --- | --- |
| field | <code>string</code> | Field name to be created |
| opts | <code>Object</code> | Options to be passed |

**Example**  
```js
module.exports = migration => {
 const blog = migration.editContentType('blog');

 blog.createField('author');
  .display_name('Author')
  .data_type('text')
  .mandatory(false);
};
```
<a name="Field+editField"></a>

### field.editField(field, opts)
Edits the field with provided uid.

**Kind**: instance method of [<code>Field</code>](#Field)  

| Param | Type | Description |
| --- | --- | --- |
| field | <code>string</code> | Field name to be edited |
| opts | <code>Object</code> | Options to be passed |

**Example**  
```js
module.exports = migration => {
const blog = migration.editContentType('blog');

blog.editField('uniqueid')
  .display_name('Unique ID')
  .mandatory(false);
};
```
<a name="Field+deleteField"></a>

### field.deleteField(field)
Delete a field from the content type

**Kind**: instance method of [<code>Field</code>](#Field)  

| Param | Type | Description |
| --- | --- | --- |
| field | <code>string</code> | Field uid to be deleted |

**Example**  
```js
module.exports = migration => {
 const blog = migration.editContentType('blog');

 blog.deleteField('uniqueid');
};
```
<a name="Field+moveField"></a>

### field.moveField(field)
Move the field (position of the field in the editor)

**Kind**: instance method of [<code>Field</code>](#Field)  

| Param | Type | Description |
| --- | --- | --- |
| field | <code>string</code> | Field uid to be moved |

**Example**  
```js
module.exports = migration => {
 const blog = migration.editContentType('blog');
 
 blog.createField('credits')
   .display_name('Credits')
   .data_type('text')
   .mandatory(false);
 
 blog.createField('references')
   .display_name('References')
   .data_type('text')
   .mandatory(false);
 
 blog.moveField('uniqueid').toTheBottom();
 blog.moveField('references').beforeField('credits');
 blog.moveField('author').toTheTop();
 blog.moveField('url').afterField('author');
};
```
<a name="Migration"></a>

## Migration
**Kind**: global class  

* [Migration](#Migration)
    * [new Migration()](#new_Migration_new)
    * [.addTask(taskDescription)](#Migration+addTask)

<a name="new_Migration_new"></a>

### new Migration()
Migration class

<a name="Migration+addTask"></a>

### migration.addTask(taskDescription)
Adds custom task in migration to execute.

**Kind**: instance method of [<code>Migration</code>](#Migration)  

| Param | Type | Description |
| --- | --- | --- |
| taskDescription | <code>Object</code> | Task title and task function to execute |
| taskDescription.title | <code>string</code> | Title for custom task |
| taskDescription.task | <code>array</code> | array of async function to be executed |
| taskDescription.failMessage | <code>string</code> | message to be printed when task fails |
| taskDescription.successMessage | <code>string</code> | message to be printed when task succeeds |

**Example**  
```js
let first = 'binding glue'
let second = 'second glue'
let task = { 
   title:'My First custom task', 
   successMessage: 'Custom success message',
   failMessage: 'Custom fail message'
   task: [async (params)=>{
       const {first, second} = params
       const a = await stackSDKInstance.fetch(); 
   }],
}
migration.addTask(task)
```
