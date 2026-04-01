import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Roles
  const roles = ["新人", "スタッフ", "店長", "マネージャー", "代表"]
  for (const r of roles) {
    await prisma.role.upsert({
      where: { id: roles.indexOf(r) + 1 },
      update: { name: r },
      create: { name: r },
    })
  }

  // Store
  const store1 = await prisma.store.upsert({
    where: { id: 1 },
    update: { name: "新宿本店" },
    create: { name: "新宿本店", isActive: true },
  })

  // Users
  const staffRole = await prisma.role.findFirst({ where: { name: "スタッフ" } })
  const managerRole = await prisma.role.findFirst({ where: { name: "店長" } })

  if (staffRole && managerRole) {
    await prisma.user.upsert({
      where: { loginId: 'staff1' },
      update: {},
      create: {
        storeId: store1.id,
        roleId: staffRole.id,
        name: "山田 太郎",
        loginId: "staff1",
        passwordHash: "dummy_hash",
        status: "ACTIVE"
      }
    })

    await prisma.user.upsert({
      where: { loginId: 'manager1' },
      update: {},
      create: {
        storeId: store1.id,
        roleId: managerRole.id,
        name: "佐藤 店長",
        loginId: "manager1",
        passwordHash: "dummy_hash",
        status: "ACTIVE"
      }
    })
  }

  console.log("Seed completely applied.")
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
