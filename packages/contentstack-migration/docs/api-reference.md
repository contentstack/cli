## Classes

<dl>
<dt><a href="#ContentType">ContentType</a> ⇐ <code><a href="#new_Base_new">Base</a></code></dt>
<dd></dd>
<dt><a href="#Field">Field</a></dt>
<dd></dd>
<dt><a href="#Migration">Migration</a></dt>
<dd></dd>
</dl>

## Typedefs

<dl>
<dt><a href="#Task">Task</a> : <code>Object</code></dt>
<dd></dd>
</dl>

<a name="ContentType"></a>

## ContentType ⇐ [<code>Base</code>](#new_Base_new)
**Kind**: global class  
**Extends**: [<code>Base</code>](#new_Base_new)  

* [ContentType](#ContentType) ⇐ [<code>Base</code>](#new_Base_new)
    * [new ContentType()](#new_ContentType_new)
    * [.createContentType(id, opts)](#ContentType+createContentType) ⇒ [<code>Field</code>](#Field)
    * [.singleton(value)](#ContentType+singleton) ⇒ [<code>ContentType</code>](#ContentType)
    * [.isPage(value)](#ContentType+isPage) ⇒ [<code>ContentType</code>](#ContentType)
    * [.editContentType(id, opts)](#ContentType+editContentType) ⇒ [<code>Field</code>](#Field)
    * [.deleteContentType(id)](#ContentType+deleteContentType) ⇒ [<code>Field</code>](#Field)
    * [.title(value)](#Base+title) ⇒ [<code>Base</code>](#new_Base_new)
    * [.description(value)](#Base+description) ⇒ [<code>Base</code>](#new_Base_new)
    * [.force(value)](#Base+force) ⇒ [<code>Base</code>](#new_Base_new)

<a name="new_ContentType_new"></a>

### new ContentType()
ContentType class

<a name="ContentType+createContentType"></a>

### contentType.createContentType(id, opts) ⇒ [<code>Field</code>](#Field)
Creates content type by passing content type name and options

**Kind**: instance method of [<code>ContentType</code>](#ContentType)  
**Returns**: [<code>Field</code>](#Field) - instance of Field  

| Param | Type | Description |
| --- | --- | --- |
| id | <code>string</code> | Content type UID |
| opts | <code>Object</code> | Optional: Content type fields definition |

**Example**  
```js
module.exports = ({migration}) => {
 const blog = migration
   .createContentType('blog')
   .title('blog title')
   .description('blog 1')
 blog.createField('title').display_name('Title').data_type('text').mandatory(true);
}
```
<a name="ContentType+singleton"></a>

### contentType.singleton(value) ⇒ [<code>ContentType</code>](#ContentType)
Set content type to singleton or multiple

**Kind**: instance method of [<code>ContentType</code>](#ContentType)  
**Returns**: [<code>ContentType</code>](#ContentType) - instance of ContentType for chaining  

| Param | Type | Description |
| --- | --- | --- |
| value | <code>boolean</code> | set value true to set content type as singleton default it is multiple |

<a name="ContentType+isPage"></a>

### contentType.isPage(value) ⇒ [<code>ContentType</code>](#ContentType)
Set content type to singleton or multiple

**Kind**: instance method of [<code>ContentType</code>](#ContentType)  
**Returns**: [<code>ContentType</code>](#ContentType) - instance of ContentType for chaining  

| Param | Type | Description |
| --- | --- | --- |
| value | <code>boolean</code> | set value false to set content type as content as block default true |

<a name="ContentType+editContentType"></a>

### contentType.editContentType(id, opts) ⇒ [<code>Field</code>](#Field)
Edits content type by passing content type name and options

**Kind**: instance method of [<code>ContentType</code>](#ContentType)  
**Returns**: [<code>Field</code>](#Field) - instance of Field  

| Param | Type | Description |
| --- | --- | --- |
| id | <code>string</code> | Content type UID |
| opts | <code>Object</code> | Optional: Content type fields definition |

**Example**  
```js
module.exports = ({migration}) => {
 const blog = migration.editContentType('blog');
 blog.description('Changed description');
}
```
<a name="ContentType+deleteContentType"></a>

### contentType.deleteContentType(id) ⇒ [<code>Field</code>](#Field)
Deletes content type by passing content type name

**Kind**: instance method of [<code>ContentType</code>](#ContentType)  
**Returns**: [<code>Field</code>](#Field) - instance of Field  

| Param | Type | Description |
| --- | --- | --- |
| id | <code>string</code> | Content type UID |

**Example**  
```js
module.exports = {migrations} => {
 const blog = migrations.deleteContentType('blog');
}
```
<a name="Base+title"></a>

### contentType.title(value) ⇒ [<code>Base</code>](#new_Base_new)
Chained function which takes value for title

**Kind**: instance method of [<code>ContentType</code>](#ContentType)  
**Returns**: [<code>Base</code>](#new_Base_new) - current instance of inherited class  

| Param | Type | Description |
| --- | --- | --- |
| value | <code>string</code> | Title |

<a name="Base+description"></a>

### contentType.description(value) ⇒ [<code>Base</code>](#new_Base_new)
Chained function which takes value for description

**Kind**: instance method of [<code>ContentType</code>](#ContentType)  
**Returns**: [<code>Base</code>](#new_Base_new) - current instance of inherited class  

| Param | Type | Description |
| --- | --- | --- |
| value | <code>string</code> | Description |

<a name="Base+force"></a>

### contentType.force(value) ⇒ [<code>Base</code>](#new_Base_new)
Chained function takes boolean value for force while deleting content type

**Kind**: instance method of [<code>ContentType</code>](#ContentType)  
**Returns**: [<code>Base</code>](#new_Base_new) - current instance of inherited class  

| Param | Type | Description |
| --- | --- | --- |
| value | <code>boolean</code> | Force delete |

<a name="Field"></a>

## Field
**Kind**: global class  

* [Field](#Field)
    * [new Field()](#new_Field_new)
    * [.createField(field, opts)](#Field+createField) ⇒ [<code>Field</code>](#Field)
    * [.editField(field, opts)](#Field+editField) ⇒ [<code>Field</code>](#Field)
    * [.deleteField(field)](#Field+deleteField) ⇒ [<code>Field</code>](#Field)
    * [.moveField(field)](#Field+moveField) ⇒ [<code>Field</code>](#Field)
    * [.display_name(value)](#Field+display_name) ⇒ [<code>Field</code>](#Field)
    * [.data_type(value)](#Field+data_type) ⇒ [<code>Field</code>](#Field)
    * [.mandatory(value)](#Field+mandatory) ⇒ [<code>Field</code>](#Field)
    * [.default(value)](#Field+default) ⇒ [<code>Field</code>](#Field)
    * [.unique(value)](#Field+unique) ⇒ [<code>Field</code>](#Field)
    * [.reference_to(value)](#Field+reference_to) ⇒ [<code>Field</code>](#Field)
    * [.ref_multiple(value)](#Field+ref_multiple) ⇒ [<code>Field</code>](#Field)
    * [.taxonomies(value)](#Field+taxonomies) ⇒ [<code>Field</code>](#Field)
    * [.multiple(value)](#Field+multiple) ⇒ [<code>Field</code>](#Field)
    * [.ref_multipleContentType(value)](#Field+ref_multipleContentType) ⇒ [<code>Field</code>](#Field)
    * [.getTaskDefinition()](#Field+getTaskDefinition) ⇒ [<code>Task</code>](#Task)

<a name="new_Field_new"></a>

### new Field()
Field class

<a name="Field+createField"></a>

### field.createField(field, opts) ⇒ [<code>Field</code>](#Field)
Creates a field with provided uid.

**Kind**: instance method of [<code>Field</code>](#Field)  
**Returns**: [<code>Field</code>](#Field) - current instance of field object to chain further methods.  

| Param | Type | Description |
| --- | --- | --- |
| field | <code>string</code> | Field name to be created |
| opts | <code>Object</code> | Options to be passed |

**Example**  
```js
module.exports =({ migration })=> {
 const blog = migration.editContentType('blog');

 blog.createField('author')
  .display_name('Author')
  .data_type('text')
  .mandatory(false);
};

Create a taxonomy field

 module.exports =({ migration })=> {
 const blog = migration.editContentType('blog');

 blog.createField('taxonomies')
  .display_name('Taxonomy1')
  .data_type('taxonomy')
  .taxonomies([{ "taxonomy_uid": "test_taxonomy1", "max_terms": 2, "mandatory": false}])
  .multiple(true)
  .mandatory(false);
};
```
<a name="Field+editField"></a>

### field.editField(field, opts) ⇒ [<code>Field</code>](#Field)
Edits the field with provided uid.

**Kind**: instance method of [<code>Field</code>](#Field)  
**Returns**: [<code>Field</code>](#Field) - current instance of field object to chain further methods.  

| Param | Type | Description |
| --- | --- | --- |
| field | <code>string</code> | Field name to be edited |
| opts | <code>Object</code> | Options to be passed |

**Example**  
```js
module.exports =({ migration })=> {
const blog = migration.editContentType('blog');

blog.editField('uniqueid')
  .display_name('Unique ID')
  .mandatory(false);
};
```
<a name="Field+deleteField"></a>

### field.deleteField(field) ⇒ [<code>Field</code>](#Field)
Delete a field from the content type

**Kind**: instance method of [<code>Field</code>](#Field)  
**Returns**: [<code>Field</code>](#Field) - current instance of field object to chain further methods.  

| Param | Type | Description |
| --- | --- | --- |
| field | <code>string</code> | Field uid to be deleted |

**Example**  
```js
module.exports =({ migration })=> {
 const blog = migration.editContentType('blog');

 blog.deleteField('uniqueid');
};
```
<a name="Field+moveField"></a>

### field.moveField(field) ⇒ [<code>Field</code>](#Field)
Move the field (position of the field in the editor)

**Kind**: instance method of [<code>Field</code>](#Field)  
**Returns**: [<code>Field</code>](#Field) - current instance of field object to chain further methods.  

| Param | Type | Description |
| --- | --- | --- |
| field | <code>string</code> | Field uid to be moved |

**Example**  
```js
module.exports = ({migration}) => {
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
<a name="Field+display_name"></a>

### field.display\_name(value) ⇒ [<code>Field</code>](#Field)
**Kind**: instance method of [<code>Field</code>](#Field)  
**Returns**: [<code>Field</code>](#Field) - current instance of field object to chain further methods.  

| Param | Type | Description |
| --- | --- | --- |
| value | <code>string</code> | set display name for the field |

<a name="Field+data_type"></a>

### field.data\_type(value) ⇒ [<code>Field</code>](#Field)
**Kind**: instance method of [<code>Field</code>](#Field)  
**Returns**: [<code>Field</code>](#Field) - current instance of field object to chain further methods.  

| Param | Type | Description |
| --- | --- | --- |
| value | <code>string</code> | Set data type of the field e.g. text, json, boolean |

<a name="Field+mandatory"></a>

### field.mandatory(value) ⇒ [<code>Field</code>](#Field)
**Kind**: instance method of [<code>Field</code>](#Field)  
**Returns**: [<code>Field</code>](#Field) - current instance of field object to chain further methods.  

| Param | Type | Description |
| --- | --- | --- |
| value | <code>boolean</code> | set true when field is mandatory |

<a name="Field+default"></a>

### field.default(value) ⇒ [<code>Field</code>](#Field)
**Kind**: instance method of [<code>Field</code>](#Field)  
**Returns**: [<code>Field</code>](#Field) - current instance of field object to chain further methods.  

| Param | Type | Description |
| --- | --- | --- |
| value | <code>string</code> \| <code>boolean</code> \| <code>number</code> | set true when field is mandatory |

<a name="Field+unique"></a>

### field.unique(value) ⇒ [<code>Field</code>](#Field)
**Kind**: instance method of [<code>Field</code>](#Field)  
**Returns**: [<code>Field</code>](#Field) - current instance of field object to chain further methods.  

| Param | Type | Description |
| --- | --- | --- |
| value | <code>boolean</code> | set true if field is unique |

<a name="Field+reference_to"></a>

### field.reference\_to(value) ⇒ [<code>Field</code>](#Field)
**Kind**: instance method of [<code>Field</code>](#Field)  
**Returns**: [<code>Field</code>](#Field) - current instance of field object to chain further methods.  
**See**: [ref_multipleContentType](ref_multipleContentType)  

| Param | Type | Description |
| --- | --- | --- |
| value | <code>string</code> \| <code>Array.&lt;string&gt;</code> | uid of reference content type set array if ref_multipleContentType true |

<a name="Field+ref_multiple"></a>

### field.ref\_multiple(value) ⇒ [<code>Field</code>](#Field)
**Kind**: instance method of [<code>Field</code>](#Field)  
**Returns**: [<code>Field</code>](#Field) - current instance of field object to chain further methods.  

| Param | Type | Description |
| --- | --- | --- |
| value | <code>string</code> | set true if accepts multiple entries as reference |

<a name="Field+taxonomies"></a>

### field.taxonomies(value) ⇒ [<code>Field</code>](#Field)
The 'taxonomies' property should contain at least one taxonomy object

**Kind**: instance method of [<code>Field</code>](#Field)  
**Returns**: [<code>Field</code>](#Field) - current instance of field object to chain further methods.  

| Param | Type | Description |
| --- | --- | --- |
| value | <code>string</code> \| <code>Array.&lt;string&gt;</code> | list of taxonomies. |

<a name="Field+multiple"></a>

### field.multiple(value) ⇒ [<code>Field</code>](#Field)
**Kind**: instance method of [<code>Field</code>](#Field)  
**Returns**: [<code>Field</code>](#Field) - current instance of field object to chain further methods.  

| Param | Type | Description |
| --- | --- | --- |
| value | <code>boolean</code> | set true if field is multiple |

<a name="Field+ref_multipleContentType"></a>

### field.ref\_multipleContentType(value) ⇒ [<code>Field</code>](#Field)
**Kind**: instance method of [<code>Field</code>](#Field)  
**Returns**: [<code>Field</code>](#Field) - current instance of field object to chain further methods.  

| Param | Type | Description |
| --- | --- | --- |
| value | <code>boolean</code> | set true if refer to multiple content types |

<a name="Field+getTaskDefinition"></a>

### field.getTaskDefinition() ⇒ [<code>Task</code>](#Task)
Once you add the fields to content type you can call this method to get the task definition

**Kind**: instance method of [<code>Field</code>](#Field)  
**Returns**: [<code>Task</code>](#Task) - This task definition is to pass to migration.addTask()  
**Example**  
```js
migration.addTask(foo.getTaskDefinition())
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
| taskDescription.task | <code>array</code> | async function to be executed |
| taskDescription.failMessage | <code>string</code> | message to be printed when task fails |
| taskDescription.successMessage | <code>string</code> | message to be printed when task succeeds |

**Example**  
```js
let first = 'binding glue'
let second = 'second glue'
let tasks = {
   title:'My First custom task',
   successMessage: 'Custom success message',
   failMessage: 'Custom fail message'
   task: async (params)=>{
       const {first, second} = params
       const a = await stackSDKInstance.fetch();
   },
}
migration.addTask(task)
```
<a name="Task"></a>

## Task : <code>Object</code>
**Kind**: global typedef  

| Param | Type | Description |
| --- | --- | --- |
| title | <code>string</code> | Title for custom task |
| task | <code>Array.&lt;function()&gt;</code> | array of async function to be executed |
| failMessage | <code>string</code> | message to be printed when task fails |
| successMessage | <code>string</code> | message to be printed when task succeeds |

----------|---------|----------|---------|---------|-------------------
File      | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
----------|---------|----------|---------|---------|-------------------
All files |       0 |        0 |       0 |       0 |                   
----------|---------|----------|---------|---------|-------------------
