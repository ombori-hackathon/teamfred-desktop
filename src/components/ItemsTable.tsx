import { Item } from "../types";

interface ItemsTableProps {
  items: Item[];
}

function ItemsTable({ items }: ItemsTableProps) {
  return (
    <table className="items-table">
      <thead>
        <tr>
          <th style={{ width: "50px" }}>ID</th>
          <th style={{ width: "150px" }}>Name</th>
          <th>Description</th>
          <th style={{ width: "80px" }}>Price</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item.id}>
            <td className="mono">{item.id}</td>
            <td>{item.name}</td>
            <td>{item.description}</td>
            <td className="mono">${item.price.toFixed(2)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default ItemsTable;
