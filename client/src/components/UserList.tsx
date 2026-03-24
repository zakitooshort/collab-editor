import type { RemoteUser } from '../hooks/useCollabDoc'

interface UserListProps {
  users: RemoteUser[]
  ownName: string
  ownColor: string
}

export function UserList({ users, ownName, ownColor }: UserListProps) {
  return (
    <aside className="w-52 shrink-0 flex flex-col gap-2">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 px-1">
        Online
      </h2>
      <ul className="flex flex-col gap-1">
        <li className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-gray-50">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: ownColor }}
          />
          <span className="text-sm text-gray-800 truncate">{ownName} (you)</span>
        </li>
        {users.map(user => (
          <li
            key={user.siteId}
            className="flex items-center gap-2 px-2 py-1.5 rounded-md"
          >
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: user.color }}
            />
            <span className="text-sm text-gray-700 truncate">{user.name}</span>
          </li>
        ))}
      </ul>
    </aside>
  )
}
