export const securityGroupArray = {
  name: 'security-group-array',
  validate: (val) => {
    if (val === null || val === '') {
      return
    }

    const uuidPattern = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}'
    const uuidRegex = new RegExp(`^${uuidPattern}$`)

    if (Array.isArray(val)) {
      for (const uuid of val) {
        if (typeof uuid !== 'string' || !uuidRegex.test(uuid)) {
          throw new Error('Must be a comma separated list of valid UUIDs')
        }
      }
      return
    }

    const commaSeparatedRegex = new RegExp(`^${uuidPattern}(,${uuidPattern})*$`)
    if (!commaSeparatedRegex.test(val)) {
      throw new Error('Must be a comma separated list of valid UUIDs')
    }
  },
  coerce: (val) => {
    if (Array.isArray(val)) {
      return val
    }
    if (val === null || val === '') {
      return []
    }
    return val.split(',')
  }
}
