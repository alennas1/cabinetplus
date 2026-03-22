import java.nio.file.*;
public class RealPathTest {
  public static void main(String[] args) throws Exception {
    System.out.println(Paths.get(args[0]).toRealPath());
  }
}

