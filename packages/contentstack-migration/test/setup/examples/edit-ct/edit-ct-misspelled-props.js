'use strict'

module.exports = migrations => {
  const foo = migrations.editContentType('foo', {
    deschripshion: 'New description',
  })
}
