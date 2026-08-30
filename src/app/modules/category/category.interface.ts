interface ICategory {
  name: string;
  description?: string;
  slug?: string;
  parentId?: string;
  parentName?: string;
  id?: string;
  icon?: string;
  status: "show" | "hide";
}

export { ICategory };
