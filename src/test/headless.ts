
import hclToJson from "hcl-to-json";

const hcl =`service "web" {
  policy = "write"
}

service "db" {
  policy = "read"
}`


const cases = () => {
    const rs = hclToJson(hcl);
    console.log(rs);
};

cases();
