import { compare, hash } from 'bcrypt'
import { $fetch } from '@utils/firebase'

const SALT_ROUNDS = 10

export const getPassword = password => new Promise((resolve, reject) => {
  hash(password, SALT_ROUNDS, (err, hashedPassword) => {
    if (err) reject(err)
    resolve(hashedPassword)
  })
})

export const comparePassword = (password, hash) => new Promise((resolve, reject) => {
  compare(password, hash, (err, res) => {
    if (err) reject(err)
    resolve(res)
  })
})
