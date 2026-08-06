export type Reservation = { type: string[]; qty: number };

// Source sheet has inconsistent typing per cell (numbers stored as strings and vice versa) —
// fields below are typed permissively to match the real imported data rather than an idealized shape.
export type StockRow = {
  tally: string | number | null;
  material: string;
  brand: string | null;
  packing: number | string | null;
  article: number | string | null;
  packingDetail: string | null;
  totalStock: number | string | null;
  batchNo: string | number | null;
  mfg: string | null;
  exp: string | null;
  in: number;
  out: number;
  opening: number | string | null;
  location: string | null;
};

export type StockItem = StockRow & {
  id: string;
  reservation?: Reservation | null;
};

export type LocationRow = { code: string };

export type TxType = "IN" | "OUT" | "TRANSFER" | "EDIT" | "DELETE" | "RESERVE" | "UNRESERVE";

export type TxLogEntry = {
  id: string;
  ts: string;
  type: TxType;
  material: string | number | null;
  brand?: string | number | null;
  batchNo?: string | number | null;
  location?: string | null;
  fromLocation?: string | null;
  toLocation?: string | null;
  packingDetail?: string | null;
  qty: number;
  resType?: string;
};

export type PackingRowInput = { size: string; count: string };

export type SortKey =
  | "material"
  | "packing"
  | "batchNo"
  | "mfg"
  | "exp"
  | "totalStock"
  | "location"
  | "reservedType";

export type LocFilter = "all" | "assigned" | "unassigned";
export type ResFilter = "all" | "PSS" | "Reservation" | "unreserved";
export type Tab = "stock" | "locations" | "log";

export type Modal =
  | { type: "out"; item: StockItem }
  | {
      type: "in";
      form: {
        material: string;
        brand: string;
        batchNo: string;
        mfg: string;
        exp: string;
        location: string;
        packingRows: PackingRowInput[];
      };
    }
  | {
      type: "transfer";
      item: StockItem;
      form: {
        material: string;
        brand: string;
        batchNo: string;
        mfg: string;
        exp: string;
        location: string;
        packingRows: PackingRowInput[];
      };
    }
  | {
      type: "edit";
      item: StockItem;
      form: {
        material: string;
        brand: string;
        batchNo: string;
        mfg: string;
        exp: string;
        packing: string;
        packingDetail: string;
        totalStock: string;
        location: string;
      };
    };
