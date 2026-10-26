// minihelm: render một Helm chart bằng text/template của Go và một phần hàm Sprig
// mà chart mẫu trong examples/ dùng. Chỉ để kiểm tra chart khi máy không có Helm;
// có Helm thì dùng `helm lint` và `helm template`.
//
//	go run ./tools/minihelm <chart-dir> <values.json> <release> <namespace>
package main

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"reflect"
	"sort"
	"strconv"
	"strings"
	"text/template"
)

func empty(v interface{}) bool {
	if v == nil {
		return true
	}
	r := reflect.ValueOf(v)
	switch r.Kind() {
	case reflect.String, reflect.Map, reflect.Slice, reflect.Array:
		return r.Len() == 0
	case reflect.Bool:
		return !r.Bool()
	case reflect.Float32, reflect.Float64:
		return r.Float() == 0
	case reflect.Int, reflect.Int64, reflect.Int32:
		return r.Int() == 0
	}
	return false
}

var plain = func(s string) bool {
	if s == "" {
		return false
	}
	low := strings.ToLower(s)
	switch low {
	case "true", "false", "yes", "no", "on", "off", "null", "~":
		return false
	}
	if _, err := strconv.ParseFloat(s, 64); err == nil {
		return false
	}
	if strings.ContainsAny(s[:1], "-?:,[]{}#&*!|>'\"%@` ") || strings.Contains(s, ": ") || strings.Contains(s, " #") || strings.HasSuffix(s, ":") || strings.HasSuffix(s, " ") || strings.Contains(s, "\n") {
		return false
	}
	return true
}

func scalar(v interface{}) string {
	switch x := v.(type) {
	case nil:
		return "null"
	case bool:
		return strconv.FormatBool(x)
	case float64:
		if x == float64(int64(x)) {
			return strconv.FormatInt(int64(x), 10)
		}
		return strconv.FormatFloat(x, 'f', -1, 64)
	case string:
		if plain(x) {
			return x
		}
		b, _ := json.Marshal(x)
		return string(b)
	}
	return fmt.Sprint(v)
}

func toYaml(v interface{}, ind int) string {
	pad := strings.Repeat("  ", ind)
	var b strings.Builder
	switch x := v.(type) {
	case map[string]interface{}:
		if len(x) == 0 {
			return "{}"
		}
		keys := make([]string, 0, len(x))
		for k := range x {
			keys = append(keys, k)
		}
		sort.Strings(keys)
		for i, k := range keys {
			if i > 0 {
				b.WriteString("\n" + pad)
			}
			val := x[k]
			switch c := val.(type) {
			case map[string]interface{}:
				if len(c) == 0 {
					b.WriteString(scalar(k) + ": {}")
				} else {
					b.WriteString(scalar(k) + ":\n" + pad + "  " + toYaml(c, ind+1))
				}
			case []interface{}:
				if len(c) == 0 {
					b.WriteString(scalar(k) + ": []")
				} else {
					b.WriteString(scalar(k) + ":\n" + pad + toYaml(c, ind))
				}
			default:
				b.WriteString(scalar(k) + ": " + scalar(val))
			}
		}
	case []interface{}:
		if len(x) == 0 {
			return "[]"
		}
		for i, it := range x {
			if i > 0 {
				b.WriteString("\n" + pad)
			}
			b.WriteString("- " + toYaml(it, ind+1))
		}
	default:
		return scalar(v)
	}
	return b.String()
}

func indent(n int, s string) string {
	p := strings.Repeat(" ", n)
	return p + strings.ReplaceAll(s, "\n", "\n"+p)
}

func main() {
	if len(os.Args) != 5 {
		fmt.Fprintln(os.Stderr, "usage: minihelm <chart-dir> <values.json> <release> <namespace>")
		os.Exit(2)
	}
	dir, vfile, rel, ns := os.Args[1], os.Args[2], os.Args[3], os.Args[4]
	var values map[string]interface{}
	raw, err := os.ReadFile(vfile)
	check(err)
	check(json.Unmarshal(raw, &values))
	var chart map[string]interface{}
	craw, err := os.ReadFile(filepath.Join(dir, "Chart.json"))
	check(err)
	check(json.Unmarshal(craw, &chart))
	name := chart["name"].(string)

	var root *template.Template
	funcs := template.FuncMap{
		"include": func(n string, d interface{}) (string, error) {
			var buf bytes.Buffer
			err := root.ExecuteTemplate(&buf, n, d)
			return buf.String(), err
		},
		"toYaml":     func(v interface{}) string { return strings.TrimSuffix(toYaml(v, 0), "\n") },
		"nindent":    func(n int, s string) string { return "\n" + indent(n, s) },
		"indent":     indent,
		"default":    func(d interface{}, v ...interface{}) interface{} { if len(v) == 0 || empty(v[0]) { return d }; return v[0] },
		"quote":      func(v interface{}) string { return strconv.Quote(fmt.Sprint(v)) },
		"trunc":      func(n int, s string) string { if len(s) > n { return s[:n] }; return s },
		"trimSuffix": func(suf, s string) string { return strings.TrimSuffix(s, suf) },
		"replace":    func(o, n, s string) string { return strings.ReplaceAll(s, o, n) },
		"contains":   func(sub, s string) bool { return strings.Contains(s, sub) },
		"sha256sum":  func(s string) string { h := sha256.Sum256([]byte(s)); return hex.EncodeToString(h[:]) },
		"list":       func(v ...interface{}) []interface{} { return v },
		"required":   func(msg string, v interface{}) (interface{}, error) { if empty(v) { return nil, fmt.Errorf("%s", msg) }; return v, nil },
	}
	root = template.New(name).Funcs(funcs).Option("missingkey=zero")
	var files []string
	check(filepath.Walk(filepath.Join(dir, "templates"), func(p string, info os.FileInfo, err error) error {
		if err == nil && !info.IsDir() {
			rp, _ := filepath.Rel(dir, p)
			tn := name + "/" + filepath.ToSlash(rp)
			b, e := os.ReadFile(p)
			check(e)
			_, e = root.New(tn).Parse(string(b))
			check(e)
			files = append(files, tn)
		}
		return nil
	}))
	sort.Strings(files)
	data := map[string]interface{}{
		"Values":  values,
		"Chart":   map[string]interface{}{"Name": name, "Version": chart["version"], "AppVersion": chart["appVersion"]},
		"Release": map[string]interface{}{"Name": rel, "Namespace": ns, "Service": "Helm", "IsInstall": true},
	}
	for _, f := range files {
		base := filepath.Base(f)
		if strings.HasPrefix(base, "_") || base == "NOTES.txt" {
			continue
		}
		data["Template"] = map[string]interface{}{"Name": f, "BasePath": name + "/templates"}
		var buf bytes.Buffer
		if err := root.ExecuteTemplate(&buf, f, data); err != nil {
			fmt.Fprintln(os.Stderr, "render", f, ":", err)
			os.Exit(1)
		}
		out := strings.TrimSpace(buf.String())
		if out != "" {
			fmt.Printf("---\n# Source: %s\n%s\n", f, out)
		}
	}
	data["Template"] = map[string]interface{}{"Name": name + "/templates/NOTES.txt", "BasePath": name + "/templates"}
	var notes bytes.Buffer
	if t := root.Lookup(name + "/templates/NOTES.txt"); t != nil {
		check(t.Execute(&notes, data))
		fmt.Fprintln(os.Stderr, notes.String())
	}
}

func check(err error) {
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
